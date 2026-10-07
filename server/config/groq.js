// Groq retires models periodically; override with GROQ_MODEL instead of editing code.
export const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

// gpt-oss is a reasoning model: reasoning tokens count against max_tokens,
// so keep effort low and leave headroom for the JSON answer.
export const GROQ_REASONING_EFFORT = "low";
