import type { LucideIcon } from 'lucide-react'

interface ComingSoonProps {
  title: string
  description: string
  icon: LucideIcon
  phase: string
}

export function ComingSoon({ title, description, icon: Icon, phase }: ComingSoonProps) {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-brand-teal-light flex items-center justify-center mx-auto">
            <Icon className="w-8 h-8 text-brand-teal" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{title}</h1>
            <p className="text-sm text-gray-500 mt-2 leading-relaxed">{description}</p>
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-teal-light border border-brand-teal/20">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-gold animate-pulse" />
            <span className="text-sm font-medium text-brand-teal">Coming soon · {phase}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
