import prisma from "../config/db.config.js";
import bcrypt from "bcrypt";

const registerUser = async (req, res) => {
  try {
    const { name, email, password, firstName, lastName } = req.body;
    if (
      [name, email, password, firstName, lastName].some(
        (e) => typeof e !== "string" || !e.trim(),
      )
    ) {
      return res.status(400).json({ error: "All fields are required.0" });
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

    return res
      .status(201)
      .json({ message: "Registered successfully!", user: newUser.id });
  } catch (error) {
    console.log("Error in registering.", error.message);
    return res.status(500).json(error.message);
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

    return res
      .status(200)
      .json({ message: "User logged in.", user: userExists.id });
  } catch (error) {
    console.log("Error in logging in.", error.message);
    return res.status(500).json(error.message);
  }
};

export { registerUser, loginUser };
