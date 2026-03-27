export interface CalculatorState {
  rowInput: number
  colInput: number
  result: string | null
  massResult: string | null
  isLoading: boolean
  error: string | null
}

export interface ResultItem {
  label: string
  value: string
  number: string
}
