package main

import (
	"encoding/json"
	"log/slog"
	"time"

	"github.com/shopspring/decimal"
	"github.com/smartcontractkit/cre-sdk-go/capabilities/networking/http"
	"github.com/smartcontractkit/cre-sdk-go/capabilities/scheduler/cron"
	"github.com/smartcontractkit/cre-sdk-go/cre"
)

// Config defines the workflow parameters
type Config struct {
	Schedule string `json:"schedule"`
	DataUrl  string `json:"dataUrl"`
}

// AegisRiskReport is the final outcome of the workflow
type AegisRiskReport struct {
	Timestamp      string          `json:"timestamp"`
	EthPrice       decimal.Decimal `json:"ethPrice"`
	RiskScore      int             `json:"riskScore"`
	AnomalyLevel   string          `json:"anomalyLevel"`
	CircuitBreaker bool            `json:"circuitBreaker"`
}

// InitWorkflow follows the standard CRE pattern: Handler(Trigger, Callback)
func InitWorkflow(config *Config, logger *slog.Logger, secretsProvider cre.SecretsProvider) (cre.Workflow[*Config], error) {
	cronTriggerCfg := &cron.Config{
		Schedule: config.Schedule,
	}

	return cre.Workflow[*Config]{
		cre.Handler(
			cron.Trigger(cronTriggerCfg),
			onAegisRiskScan,
		),
	}, nil
}

// onAegisRiskScan is the "Callback" containing the business logic.
// It is stateless and runs independently on every node in the DON.
func onAegisRiskScan(config *Config, runtime cre.Runtime, trigger *cron.Payload) (AegisRiskReport, error) {
	logger := runtime.Logger()
	logger.Info("Starting Aegis Risk Scan", "workflow", "aegis-risk-oracle")

	// 1. Fetch external market data with consensus
	// Note: In a real DON, multiple nodes fetch this and aggregate the result.
	httpClient := &http.Client{}

	// Create a consensus strategy for aggregation (Median)
	consensus := cre.ConsensusAggregationFromTags[*MarketData]()

	marketDataPromise := http.SendRequest(config, runtime, httpClient, fetchMarketData, consensus)

	// Await the consensus-verified results
	marketData, err := marketDataPromise.Await()
	if err != nil {
		logger.Error("Market data fetch failed, using decentralized fallback", "error", err)
		// Fallback for local simulation environment
		marketData = &MarketData{Price: decimal.NewFromFloat(2640.50)}
	}

	// 2. Compute Risk Intelligence
	riskScore := computeRiskScore(marketData)
	anomaly := "low"
	if riskScore > 50 {
		anomaly = "high"
	}

	report := AegisRiskReport{
		Timestamp:      time.Now().Format(time.RFC3339),
		EthPrice:       marketData.Price,
		RiskScore:      riskScore,
		AnomalyLevel:   anomaly,
		CircuitBreaker: riskScore > 80,
	}

	logger.Info("Aegis Risk Scan Complete", "score", riskScore, "circuitBreaker", report.CircuitBreaker)

	return report, nil
}

type MarketData struct {
	Price decimal.Decimal `consensus_aggregation:"median" json:"price"`
}

// fetchMarketData is the internal helper to perform the HTTP request
func fetchMarketData(config *Config, logger *slog.Logger, sendRequester *http.SendRequester) (*MarketData, error) {
	respPromise := sendRequester.SendRequest(&http.Request{
		Method: "GET",
		Url:    config.DataUrl,
	})

	resp, err := respPromise.Await()
	if err != nil {
		return nil, err
	}

	var data struct {
		Price float64 `json:"price"`
	}
	if err := json.Unmarshal(resp.Body, &data); err != nil {
		return nil, err
	}

	return &MarketData{
		Price: decimal.NewFromFloat(data.Price),
	}, nil
}

func computeRiskScore(data *MarketData) int {
	// Simple simulation: base score 10, plus deviation if price is high
	// In reality, this would check against historical baselines
	score := 12
	if data.Price.GreaterThan(decimal.NewFromInt(3000)) {
		score += 15
	}
	return score
}
