import express from "express";
import cors from "cors";
import { configDotenv } from "dotenv";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
//const { rateLimit } = require("express-rate-limit");
import { rateLimit } from "express-rate-limit";

import fs from 'fs/promises';


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
app.use(express.static("public"))

app.get("/",(req,res)=>{
	console.log('avavavva');
	res.send("Welcome prisma api");
	
})

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
  

    app.listen(PORT, () => {
		
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Error connecting to database:", error);
    process.exit(1);
  }
}

startServer();
