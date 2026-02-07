export interface CalculationResult {
  id: string
  principalValue: number
  interestValue: number
  correctionValue: number
  totalValue: number
  startDate: string
  endDate: string
  interestRate: number
  correctionIndex: string
  calculationType: "simple" | "compound"
  calculatedAt: string
}
