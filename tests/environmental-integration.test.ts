import { describe, it, expect, beforeEach } from "vitest"

// Mock Clarity contract for environmental integration
const mockEnvContract = {
  maps: new Map(),
  dataVars: new Map(),
  blockHeight: 1000,
  txSender: "SP1234567890ABCDEF",
  
  init() {
    this.dataVars.set("measurement-counter", 0)
  },
  
  calculateSustainabilityScore(soilPh, moistureLevel, quantumFieldStrength, temperature) {
    const phScore = soilPh >= 60 && soilPh <= 75 ? 25 : 10
    const moistureScore = moistureLevel >= 40 && moistureLevel <= 80 ? 25 : 10
    const quantumScore = quantumFieldStrength >= 50 ? 25 : 10
    const tempScore = temperature >= 15 && temperature <= 30 ? 25 : 10
    
    return phScore + moistureScore + quantumScore + tempScore
  },
  
  recordEnvironmentalData(location, soilPh, moistureLevel, quantumFieldStrength, temperature) {
    if (soilPh > 140 || moistureLevel > 100 || quantumFieldStrength > 100 || temperature > 50) {
      return { error: 301 } // err-invalid-data
    }
    
    const measurementId = this.dataVars.get("measurement-counter") + 1
    const sustainabilityScore = this.calculateSustainabilityScore(
        soilPh,
        moistureLevel,
        quantumFieldStrength,
        temperature,
    )
    
    this.maps.set(`environmental-data-${measurementId}`, {
      location,
      soilPh,
      moistureLevel,
      quantumFieldStrength,
      temperature,
      sustainabilityScore,
      measurementDate: this.blockHeight,
    })
    
    // Update location history
    const currentHistory = this.maps.get(`location-history-${location}`) || []
    if (currentHistory.length < 50) {
      currentHistory.push(measurementId)
      this.maps.set(`location-history-${location}`, currentHistory)
    }
    
    this.dataVars.set("measurement-counter", measurementId)
    
    return { success: measurementId }
  },
  
  getEnvironmentalData(measurementId) {
    return this.maps.get(`environmental-data-${measurementId}`) || null
  },
  
  getLocationHistory(location) {
    return this.maps.get(`location-history-${location}`) || []
  },
  
  getOptimalConditions(location) {
    const history = this.getLocationHistory(location)
    if (history.length === 0) {
      return { error: 302 } // err-location-not-found
    }
    
    const latestId = history[history.length - 1]
    const latestData = this.getEnvironmentalData(latestId)
    
    return {
      success: {
        recommendedPh: 65,
        recommendedMoisture: 60,
        recommendedQuantumField: 75,
        recommendedTemperature: 22,
        currentSustainability: latestData.sustainabilityScore,
      },
    }
  },
}

describe("Environmental Integration Contract", () => {
  beforeEach(() => {
    mockEnvContract.maps.clear()
    mockEnvContract.dataVars.clear()
    mockEnvContract.init()
  })
  
  describe("calculate-sustainability-score", () => {
    it("should return maximum score for optimal conditions", () => {
      const score = mockEnvContract.calculateSustainabilityScore(65, 60, 75, 22)
      expect(score).toBe(100) // 25 + 25 + 25 + 25
    })
    
    it("should return lower score for suboptimal pH", () => {
      const score = mockEnvContract.calculateSustainabilityScore(50, 60, 75, 22)
      expect(score).toBe(85) // 10 + 25 + 25 + 25
    })
    
    it("should return lower score for suboptimal moisture", () => {
      const score = mockEnvContract.calculateSustainabilityScore(65, 30, 75, 22)
      expect(score).toBe(85) // 25 + 10 + 25 + 25
    })
    
    it("should return lower score for suboptimal quantum field", () => {
      const score = mockEnvContract.calculateSustainabilityScore(65, 60, 40, 22)
      expect(score).toBe(85) // 25 + 25 + 10 + 25
    })
    
    it("should return lower score for suboptimal temperature", () => {
      const score = mockEnvContract.calculateSustainabilityScore(65, 60, 75, 35)
      expect(score).toBe(85) // 25 + 25 + 25 + 10
    })
    
    it("should return minimum score for all suboptimal conditions", () => {
      const score = mockEnvContract.calculateSustainabilityScore(50, 30, 40, 35)
      expect(score).toBe(40) // 10 + 10 + 10 + 10
    })
  })
  
  describe("record-environmental-data", () => {
    it("should successfully record environmental data", () => {
      const result = mockEnvContract.recordEnvironmentalData("Farm-A-Field-1", 65, 60, 75, 22)
      
      expect(result.success).toBe(1)
      
      const data = mockEnvContract.getEnvironmentalData(1)
      expect(data.location).toBe("Farm-A-Field-1")
      expect(data.soilPh).toBe(65)
      expect(data.moistureLevel).toBe(60)
      expect(data.quantumFieldStrength).toBe(75)
      expect(data.temperature).toBe(22)
      expect(data.sustainabilityScore).toBe(100)
      expect(data.measurementDate).toBe(1000)
    })
    
    it("should fail with invalid soil pH (too high)", () => {
      const result = mockEnvContract.recordEnvironmentalData("Farm-A-Field-1", 141, 60, 75, 22)
      
      expect(result.error).toBe(301) // err-invalid-data
    })
    
    it("should fail with invalid moisture level (too high)", () => {
      const result = mockEnvContract.recordEnvironmentalData("Farm-A-Field-1", 65, 101, 75, 22)
      
      expect(result.error).toBe(301) // err-invalid-data
    })
    
    it("should fail with invalid quantum field strength (too high)", () => {
      const result = mockEnvContract.recordEnvironmentalData("Farm-A-Field-1", 65, 60, 101, 22)
      
      expect(result.error).toBe(301) // err-invalid-data
    })
    
    it("should fail with invalid temperature (too high)", () => {
      const result = mockEnvContract.recordEnvironmentalData("Farm-A-Field-1", 65, 60, 75, 51)
      
      expect(result.error).toBe(301) // err-invalid-data
    })
    
    it("should track location history", () => {
      mockEnvContract.recordEnvironmentalData("Farm-A-Field-1", 65, 60, 75, 22)
      mockEnvContract.recordEnvironmentalData("Farm-A-Field-1", 70, 65, 80, 25)
      
      const history = mockEnvContract.getLocationHistory("Farm-A-Field-1")
      expect(history).toEqual([1, 2])
    })
    
    it("should handle multiple locations", () => {
      mockEnvContract.recordEnvironmentalData("Farm-A-Field-1", 65, 60, 75, 22)
      mockEnvContract.recordEnvironmentalData("Farm-B-Field-1", 70, 65, 80, 25)
      
      const historyA = mockEnvContract.getLocationHistory("Farm-A-Field-1")
      const historyB = mockEnvContract.getLocationHistory("Farm-B-Field-1")
      
      expect(historyA).toEqual([1])
      expect(historyB).toEqual([2])
    })
  })
  
  describe("get-optimal-conditions", () => {
    beforeEach(() => {
      mockEnvContract.recordEnvironmentalData("Farm-A-Field-1", 65, 60, 75, 22)
    })
    
    it("should return optimal conditions for location with data", () => {
      const result = mockEnvContract.getOptimalConditions("Farm-A-Field-1")
      
      expect(result.success).toBeDefined()
      expect(result.success.recommendedPh).toBe(65)
      expect(result.success.recommendedMoisture).toBe(60)
      expect(result.success.recommendedQuantumField).toBe(75)
      expect(result.success.recommendedTemperature).toBe(22)
      expect(result.success.currentSustainability).toBe(100)
    })
    
    it("should fail for location with no data", () => {
      const result = mockEnvContract.getOptimalConditions("Unknown-Location")
      
      expect(result.error).toBe(302) // err-location-not-found
    })
    
    it("should use latest measurement for recommendations", () => {
      // Add another measurement with different sustainability score
      mockEnvContract.recordEnvironmentalData("Farm-A-Field-1", 50, 30, 40, 35)
      
      const result = mockEnvContract.getOptimalConditions("Farm-A-Field-1")
      
      expect(result.success.currentSustainability).toBe(40) // Latest measurement
    })
  })
  
  describe("edge cases", () => {
    it("should handle minimum valid values", () => {
      const result = mockEnvContract.recordEnvironmentalData("Test-Location", 0, 0, 0, 0)
      
      expect(result.success).toBe(1)
      
      const data = mockEnvContract.getEnvironmentalData(1)
      expect(data.sustainabilityScore).toBe(40) // All suboptimal
    })
    
    it("should handle boundary pH values", () => {
      // Test lower boundary
      let result = mockEnvContract.recordEnvironmentalData("Test-Location-1", 60, 60, 75, 22)
      expect(result.success).toBe(1)
      let data = mockEnvContract.getEnvironmentalData(1)
      expect(data.sustainabilityScore).toBe(100)
      
      // Test upper boundary
      result = mockEnvContract.recordEnvironmentalData("Test-Location-2", 75, 60, 75, 22)
      expect(result.success).toBe(2)
      data = mockEnvContract.getEnvironmentalData(2)
      expect(data.sustainabilityScore).toBe(100)
    })
    
    it("should return empty array for location with no history", () => {
      const history = mockEnvContract.getLocationHistory("Non-Existent-Location")
      expect(history).toEqual([])
    })
    
    it("should handle location history limit", () => {
      // Add 51 measurements to test the 50-item limit
      for (let i = 0; i < 51; i++) {
        mockEnvContract.recordEnvironmentalData("Test-Location", 65, 60, 75, 22)
      }
      
      const history = mockEnvContract.getLocationHistory("Test-Location")
      expect(history.length).toBe(50) // Should be capped at 50
    })
  })
})
