/** Explicit demo routing. This does not claim to be LLM function-call inference. */
export function routeTool(input: string) {
  if (/weather|天气/i.test(input))
    return {
      name: 'get_weather',
      arguments: {
        city: /(?:in|for)\s+([\p{L}\s]+)[?.]?$/iu.exec(input)?.[1]?.trim() || 'Shanghai',
      },
    };
  if (/calculat|计算|\d\s*[+*/]/i.test(input))
    return {
      name: 'calculate',
      arguments: { expression: input.replace(/^(?:calculate|计算)\s*[:：]?\s*/i, '').trim() },
    };
  if (/search|knowledge|知识|检索/i.test(input))
    return {
      name: 'search_knowledge',
      arguments: { query: input.replace(/^(?:search|搜索|检索)\s*/i, ''), top_k: 3 },
    };
  return {
    name: 'get_market_data',
    arguments: {
      symbol: /\b(ETH|SOL|BTC)\b/i.exec(input)?.[1]?.toUpperCase() || 'BTC',
      interval: '24h',
    },
  };
}
