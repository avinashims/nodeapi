import express from "express";
import cors from "cors";
import prisma from "./config/database.js";
import userRoutes from "./routes/userRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import wishlistRoutes from "./routes/wishlistRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import faqRoutes from "./routes/faqRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import testimonialRoutes from "./routes/testimonialRoutes.js";
import topModelsRoutes from "./routes/topModelsRoutes.js";
import aboutUsRoutes from "./routes/aboutUsRoutes.js";
import careerRoutes from "./routes/careerRoutes.js";
import privacyPolicyRoutes from "./routes/privacyPolicyRoutes.js";
import termsAndConditionsRoutes from "./routes/termsAndConditionsRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import { configDotenv } from "dotenv";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
//const { rateLimit } = require("express-rate-limit");
import { rateLimit } from "express-rate-limit";

import swaggerUi  from 'swagger-ui-express';
import fs from 'fs/promises';

const data = await fs.readFile('./swagger-output.json', 'utf-8');
const swaggerDocument = JSON.parse(data);





const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 5 minutes
  limit: 2, // each IP can make up to 10 requests per `windowsMs` (5 minutes)
  standardHeaders: true, // add the `RateLimit-*` headers to the response
  legacyHeaders: false, // remove the `X-RateLimit-*` headers from the response
});


const app = express();
configDotenv();

const corsOptions = {
  origin: true,
  credentials: true,
  optionsSuccessStatus: 200,
};
//app.use(limiter);

app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(express.json());
app.use(cookieParser());
app.use(express.static("public"));


// Swagger UI endpoint
//app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));



app.use("/api/auth", userRoutes);
app.use("/", categoryRoutes);
app.use("/", productRoutes);
app.use("/", wishlistRoutes);
app.use("/", cartRoutes);
app.use("/", faqRoutes);
app.use("/", contactRoutes);
app.use("/", testimonialRoutes);
app.use("/", topModelsRoutes);
app.use("/", aboutUsRoutes);
app.use("/", careerRoutes);
app.use("/", privacyPolicyRoutes);
app.use("/", termsAndConditionsRoutes);
app.use("/", adminRoutes);
app.get("/",(req,res)=>{
	console.log('avavavva');
	res.send("Welcome prisma api");
	
})

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await prisma.$connect();
    console.log("Connected to the database");

    app.listen(PORT, () => {
		//debugger;
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Error connecting to database:", error);
    process.exit(1);
  }
}

startServer();
