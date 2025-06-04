## Shoes E-commerce Website API

### Table of Contents

- [Prerequisites](#Prerequisites)
- [Tech Stack](#Tech-Stack)
- [Getting Started](#Getting-Started)
- [Project Structure](#Project-Structure)

#

### Prerequisites

- <img src="./readme/nodejs.png" width="25" style="top: 8px" /> Node JS @16.X and up
- <img src="./readme/npm.png" width="25" style="top: 8px" /> npm @8 and up

#

### Tech Stack

- <img src="./readme/bcrypt.jpeg" width="25" style="top: 8px" /> bcrypt @ 5.1.1 - Library for hashing passwords.
- <img src="./readme/cookie-parser.png" width="25" style="top: 8px" /> cookie-parser @ 1.4.6 - Middleware for parsing cookies.
- <img src="./readme/cors.png" width="25" style="top: 8px" /> cors @ 2.8.5 - Middleware for enabling CORS in Express.
- <img src="./readme/dotenv.png" width="25" style="top: 8px" /> dotenv @ 16.4.5 - Zero-dependency module for loading environment variables.
- <img src="./readme/express.png" width="25" style="top: 8px" /> express @ 4.19.2 - Web framework for Node.js.
- <img src="./readme/jsonwebtoken.png" width="25" style="top: 8px" /> jsonwebtoken @ 9.0.2 - Library for generating JWTs.
- <img src="./readme/prisma.png" width="25" style="top: 8px" /> Prisma @ 5.16.2 - Next-generation ORM for Node.js and TypeScript.
- <img src="./readme/MySql.png" width="25" style="top: 8px" /> MySQL @ 2.18.1 - MySQL client for Node.js.
- <img src="./readme/Joi.png" width="25" style="top: 8px" /> Joi @ 17.13.3 - Data validation library for JavaScript.
- <img src="./readme/nodemailer.webp" width="25" style="top: 8px" /> nodemailer @ 6.9.14 - Module for sending emails.
- <img src="./readme/uuid.png" width="25" style="top: 8px" /> uuid @ 10.0.0 - Generates UUIDs.

#

### Getting Started

1. First of all you need to clone app repository from github:

```
git clone https://github.com/Tusho7/e-commerce-api
```

2. Next step requires install all dependencies.

```
npm install
```

3. Also you need to create .env file where copy information from .env.example file

```
Create a .env file based on the .env.example template.
Update the variables with your MySQL database connection URI and other configuration settings.
```

4. Run the Prisma migrations to set up the database:

```
npx prisma migrate dev --name init
```

### Project Structure

```
src
├── config          # Configuration files
├── controllers     # Controller files
├── joi             # Joi Validation
├── middlewares     # Middleware functions
├── prisma          # Database models
├── routes          # Router files
├── utils           # Utility functions
└── server.js       # Main server file

```

### Config: Contains configuration files such as database connection setup.

### Controllers: Handles business logic, interacting with models and returning responses.

### Joi: Contains validations.

### Middlewares: Includes middleware functions for handling requests before they reach the routes.

### Prisma: Defines data models using prisma for interacting with MySQL.

### Routes: Defines API routes and their corresponding controller methods.

### Utils: Utility functions used across the application.

### Server.js: Entry point file that initializes and starts the Express server.

Feel free to adjust the sections and details according to your specific project setup and requirements. This README template provides a clear structure and instructions for setting up and understanding your Shoes E-commerce Website API project.
