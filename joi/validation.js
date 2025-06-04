import Joi from "joi";

const EMAIL_REGEX = /^[a-zA-Z0-9._:$!%-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*[0-9]).{8,}$/;

export const registerUserSchema = Joi.object({
  email: Joi.string().email().pattern(EMAIL_REGEX).required(),
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  password: Joi.string().pattern(PASSWORD_REGEX).required(),
});

export const loginUserSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});
