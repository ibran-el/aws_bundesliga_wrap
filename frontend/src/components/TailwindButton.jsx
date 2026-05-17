export function TailwindButton() {
  return (
    <div className="flex flex-col gap-4 p-8 bg-neutral-50 rounded-lg">
      <h2 className="text-2xl font-bold text-neutral-900">Tailwind CSS Test</h2>
      
      <div className="flex flex-wrap gap-3">
        {/* Primary button */}
        <button className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">
          Primary Button
        </button>
        
        {/* Success button */}
        <button className="px-6 py-2 bg-success text-white font-semibold rounded-lg hover:bg-emerald-600 transition-colors">
          Success Button
        </button>
        
        {/* Error button */}
        <button className="px-6 py-2 bg-error text-white font-semibold rounded-lg hover:bg-red-500 transition-colors">
          Error Button
        </button>
        
        {/* Warning button */}
        <button className="px-6 py-2 bg-warning text-white font-semibold rounded-lg hover:bg-amber-500 transition-colors">
          Warning Button
        </button>
        
        {/* Secondary button */}
        <button className="px-6 py-2 bg-neutral-200 text-neutral-900 font-semibold rounded-lg hover:bg-neutral-300 transition-colors">
          Secondary Button
        </button>
      </div>
      
      <p className="text-neutral-600 text-sm">
        ✅ Tailwind CSS is working! All buttons use Tailwind utility classes.
      </p>
    </div>
  )
}
