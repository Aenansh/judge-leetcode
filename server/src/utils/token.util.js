import jwt from "jsonwebtoken";
import env from "./env.util.js";

const createToken = (id, name, email) => {
  return jwt.sign(
    {
      id,
      name,
      email,
    },
    env.ACCESS_TOKEN_SECRET,
    { expiresIn: "3d" },
  );
};

export default createToken;
