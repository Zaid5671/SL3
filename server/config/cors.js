const parseAllowedOrigins = () => {
  if (process.env.CLIENT_URL) {
    return process.env.CLIENT_URL.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);
  }

  return [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
  ];
};

export const allowedOrigins = parseAllowedOrigins();

export const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
};
