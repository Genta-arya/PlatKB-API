import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
const prisma = new PrismaClient();

const secretKey = "bengkelku";

export const generateJWTToken = (user) => {
  const payload = {
    userId: user.id,
    username: user.username,
  };
  const expiresIn = "3d";
  const token = jwt.sign(payload, secretKey, { expiresIn });
  return token;
};

export const handleRegister = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: "Semua field harus diisi" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const existingUser = await prisma.auth.findFirst({
      where: {
        OR: [{ username: { equals: username } }, { email: { equals: email } }],
      },
    });

    if (existingUser) {
      return res
        .status(400)
        .json({ error: "Email atau username sudah digunakan" });
    }

    const token = generateJWTToken({
      username,
      email,
    });

    const user = await prisma.auth.create({
      data: {
        username,
        email,
        password: hashedPassword,
        role: "admin",
        token_jwt: token,
      },
    });

    const userResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      token: token,
    };
    res
      .status(201)
      .json({ data: userResponse, message: "created succes", status: 201 });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal Server Error" });
  } finally {
    await prisma.$disconnect();
  }
};

export const handleLogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "Username dan password harus diisi" });
    }

    const user = await prisma.auth.findUnique({
      where: {
        username,
      },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Username atau password salah" });
    }

    if (!user.token_jwt) {
      const token = generateJWTToken(user);

      await prisma.auth.update({
        where: {
          uid: user.uid,
        },
        data: {
          token_jwt: token,
        },
      });
    }

    const updatedUser = await prisma.auth.findUnique({
      where: {
        uid: user.uid,
      },
    });

    res.status(200).json({
      uid: updatedUser.uid,
      username: updatedUser.username,
      email: updatedUser.email,
      token: updatedUser.token_jwt,
      role: updatedUser.role,
      isLoggIn: true,
      status: 200,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  } finally {
    await prisma.$disconnect();
  }
};

export const isLoggIn = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(401).json({
        data: {
          isLogged: false,
          error: "Token tidak valid",
          status: 401,
        },
      });
    }

    const decodedToken = jwt.decode(token); 

    if (decodedToken && decodedToken.exp < Date.now() / 1000) {
      const user = await prisma.auth.findUnique({
        where: { token_jwt: token },
      });

      if (user) {
        await prisma.auth.update({
          where: { uid: user.uid },
          data: { token_jwt: null },
        });
      }

      return res.status(400).json({
        data: {
          isLogged: false,
          error: "Token sudah kadaluwarsa, silahkan login kembali",
          status: 400,
        },
      });
    }

    const user = await prisma.auth.findUnique({
      where: { token_jwt: token },
    });

    if (user) {
      const { username, email, token_jwt, role, uid, avatar, name } = user;
      return res.status(200).json({
        data: {
          isLogged: true,
          username,
          email,
          token: token_jwt,
          role,
          uid,
          avatar,
          name,
        },
      });
    } else {
      return res.status(401).json({
        data: {
          isLogged: false,
          error: "Token tidak valid silahkan Login kembali",
          status: 401,
        },
      });
    }
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "Internal Server Error", status: 500 });
  } finally {
    await prisma.$disconnect();
  }
};
export const Logout = async (req, res) => {
  try {
    const { token } = req.body;
    const tokenString = token.toString();

    if (!token) {
      return res
        .status(200)
        .json({ isLogged: false, error: "Token tidak valid" });
    }

    const user = await prisma.auth.findUnique({
      where: {
        token_jwt: tokenString,
      },
    });

    if (!user) {
      return res
        .status(200)
        .json({ isLogged: false, error: "Token tidak ditemukan" });
    }

    // Update user data to remove the token
    await prisma.auth.update({
      where: {
        uid: user.uid,
      },
      data: {
        token_jwt: null,
      },
    });

    res
      .status(200)
      .json({ isLogged: false, message: "Logout berhasil", status: 200 });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  } finally {
    await prisma.$disconnect();
  }
};

export const changePassword = async (req, res) => {
  const { username, password, confirmPassword } = req.body;

  try {
    const findUser = await prisma.auth.findUnique({
      where: {
        username: username,
      },
    });

    if (!findUser) {
      return res.status(404).json({ error: "Akun tidak ditemukan" });
    }


    if (password !== confirmPassword) {
      return res
        .status(400)
        .json({ error: "Konfirmasi password tidak sesuai" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.auth.update({
      where: {
        username: username,
      },
      data: {
        password: hashedPassword,
      },
    });

    res.status(200).json({ message: "Password berhasil diubah", status: 200 });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Terjadi kesalahan pada server" });
  }
};
