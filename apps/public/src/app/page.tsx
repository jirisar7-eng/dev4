import content from "../content/dev-placeholder.cs.json";

export default function DevPlaceholderPage() {
  return (
    <main className="max-w-2xl w-full p-8 text-center font-mono">
      <h1 className="text-4xl font-bold mb-4 tracking-wider">{content["dev.placeholder.title"]}</h1>
      <p className="text-xl mb-8 text-gray-600">{content["dev.placeholder.subtitle"]}</p>
      
      <div className="bg-white border border-gray-200 p-6 rounded-lg text-left inline-block w-full max-w-md mx-auto shadow-sm">
        <ul className="space-y-4 text-sm text-gray-700 font-mono">
          <li className="flex items-center">
            <span className="text-green-600 mr-2">✓</span>
            {content["dev.placeholder.moduleFramework"]}
          </li>
          <li className="flex items-center">
            <span className="text-yellow-600 mr-2">⟳</span>
            {content["dev.placeholder.cms"]}
          </li>
        </ul>
      </div>

      <p className="mt-12 text-xs text-gray-400 uppercase tracking-widest">{content["dev.placeholder.environment"]}</p>
    </main>
  );
}
