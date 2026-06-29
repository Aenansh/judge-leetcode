import prisma from "../config/db.config.js";
import bcrypt from "bcrypt";
import createToken from "../utils/token.util.js";

const buildSessionUser = (user) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  firstName: user.firstName,
  lastName: user.lastName,
});

const setAccessCookie = (res, accessToken) => {
  res.cookie("access_token", accessToken, {
    maxAge: 3 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });
};

const registerUser = async (req, res) => {
  try {
    const { name, email, password, firstName, lastName } = req.body;
    if (
      [name, email, password, firstName, lastName].some(
        (e) => typeof e !== "string" || !e.trim(),
      )
    ) {
      return res.status(400).json({ error: "All fields are required." });
    }

    const userExists = await prisma.user.findUnique({
      where: { email: email },
    });

    if (userExists) {
      return res
        .status(400)
        .json({ error: "User already exists! Try logging in." });
    }

    const encryptedPassword = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: {
        email,
        name,
        firstName,
        lastName,
        password: encryptedPassword,
      },
    });

    const accessToken = createToken(newUser.id, name, email);

    setAccessCookie(res, accessToken);

    return res.status(201).json({
      message: "Registered successfully!",
      user: buildSessionUser(newUser),
    });
  } catch (error) {
    console.log("Error in registering.", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if ([email, password].some((e) => typeof e !== "string" || !e.trim())) {
      return res.status(400).json({ error: "All fields are required." });
    }

    const userExists = await prisma.user.findUnique({
      where: { email: email },
    });

    if (!userExists) {
      return res
        .status(400)
        .json({ error: "User doesn't exists! Try registering." });
    }

    if (!(await bcrypt.compare(password, userExists.password))) {
      return res.status(400).json({ error: "Incorrect password." });
    }

    const accessToken = createToken(userExists.id, userExists.name, email);

    setAccessCookie(res, accessToken);

    return res.status(200).json({
      message: "User logged in.",
      user: buildSessionUser(userExists),
    });
  } catch (error) {
    console.log("Error in logging in.", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const getCurrentUser = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    return res.status(200).json({ user });
  } catch (error) {
    console.log("Error in fetching current user.", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const logoutUser = async (_req, res) => {
  res.clearCookie("access_token", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });

  return res.status(200).json({ message: "Logged out successfully." });
};

export { registerUser, loginUser, getCurrentUser, logoutUser };
