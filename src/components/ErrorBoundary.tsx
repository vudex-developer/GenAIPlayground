import { Component, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: unknown) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  handleClearData = () => {
    if (confirm('모든 데이터를 초기화하고 새로 시작하시겠습니까?')) {
      localStorage.clear()
      window.location.reload()
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen items-center justify-center bg-[#0b0f14] p-4">
          <div className="max-w-md space-y-6 rounded-xl border border-red-500/30 bg-[#111821] p-8 text-center">
            <div className="flex justify-center">
              <div className="rounded-full bg-red-500/10 p-4">
                <AlertTriangle className="h-12 w-12 text-red-400" />
              </div>
            </div>
            
            <div>
              <h1 className="text-2xl font-bold text-slate-100">
                문제가 발생했습니다
              </h1>
              <p className="mt-2 text-sm text-slate-400">
                예기치 않은 오류가 발생했습니다.
              </p>
            </div>

            {this.state.error && (
              <details className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-left">
                <summary className="cursor-pointer text-xs font-semibold text-red-400">
                  오류 세부정보
                </summary>
                <pre className="mt-2 overflow-auto text-[10px] text-slate-300">
                  {this.state.error.message}
                </pre>
              </details>
            )}

            <div className="space-y-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-600 transition"
              >
                <RefreshCw className="h-4 w-4" />
                새로고침
              </button>
              
              <button
                type="button"
                onClick={this.handleClearData}
                className="w-full rounded-lg border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/5 transition"
              >
                데이터 초기화 및 재시작
              </button>
            </div>

            <p className="text-xs text-slate-500">
              문제가 계속되면 Export로 백업 후 데이터 초기화를 시도해보세요.
            </p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
