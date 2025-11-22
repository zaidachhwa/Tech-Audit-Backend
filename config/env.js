import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

export const JWT_SECRET = process.env.JWT_SECRET;
export const MONGODB_URL = process.env.MONGODB_URL;
export const PORT = process.env.PORT || 3000;
export const CORS_ORIGIN = process.env.CORS_ORIGIN;
export const DEPLOYED_CORS_ORIGIN = process.env.DEPLOYED_CORS_ORIGIN;
