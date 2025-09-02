import * as React from "react"

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline'
}

const getVariantClasses = (variant: string = 'default') => {
  const baseClasses = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors"
  
  switch (variant) {
    case 'secondary':
      return `${baseClasses} border-transparent bg-gray-100 text-gray-900 hover:bg-gray-200`
    case 'destructive':
      return `${baseClasses} border-transparent bg-red-500 text-white hover:bg-red-600`
    case 'outline':
      return `${baseClasses} border-gray-300 text-gray-700`
    default:
      return `${baseClasses} border-transparent bg-blue-500 text-white hover:bg-blue-600`
  }
}

function Badge({ className = '', variant = 'default', ...props }: BadgeProps) {
  const classes = `${getVariantClasses(variant)} ${className}`.trim()
  return <div className={classes} {...props} />
}

export { Badge }