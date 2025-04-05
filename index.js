const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const morgan = require("morgan");
const nodemailer = require("nodemailer");

const app = express();
const allowedOrigins = [
  "http://localhost:3000",
  "https://blog-frontend-seven-sable.vercel.app"
];

const corsOptions = {
    origin: function (origin, callback) {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        origin.endsWith(".vercel.app")
      ) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
  };

app.use(cors(corsOptions));
app.use(express.json());
app.use(morgan("dev"));

mongoose
  .connect("mongodb+srv://madhavan:1234@cluster0.a0ssi.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0")
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Could not connect to MongoDB:", err));

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "madhavan8610331381@gmail.com",
    pass: "fdtiaoqfofncivov",
  },
});

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});
const User = mongoose.model("User", UserSchema);

const PostSchema = new mongoose.Schema({
  username: { type: String, required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
});
const Post = mongoose.model("Post", PostSchema);

const BlogSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  author: { type: String, required: true },
  category: { type: String, required: true },
  externalLink: { type: String },
  createdAt: { type: Date, default: Date.now },
});
const Blog = mongoose.model("Blog", BlogSchema);

app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ status: "error", message: "Username and password are required" });
  }
  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ status: "error", message: "Username already exists" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();
    res.status(200).json({ status: "success", message: "Registration successful" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ status: "error", message: "User not found" });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ status: "error", message: "Invalid password" });
    }
    res.status(200).json({
      status: "success",
      data: {
        id: user._id,
        username: user.username,
      },
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ status: "error", message: "Login failed" });
  }
});

app.post("/post", async (req, res) => {
  const { username, title, content } = req.body;
  if (!username || !title || !content) {
    return res.status(400).json({ message: "All fields are required" });
  }
  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const newPost = new Post({
      username,
      title: title.trim(),
      content: content.trim(),
    });
    const savedPost = await newPost.save();
    res.status(201).json({ message: "Post created successfully", post: savedPost });
  } catch (err) {
    res.status(500).json({ message: "Failed to create the post", error: err.message });
  }
});

app.get("/myposts/:username", async (req, res) => {
  try {
    const posts = await Post.find({ username: req.params.username }).sort({ createdAt: -1 });
    res.json({ status: "success", data: posts });
  } catch (err) {
    res.status(500).json({ status: "error", message: "Server error while fetching posts" });
  }
});

app.get("/allposts", async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.json({ status: "success", data: posts });
  } catch (error) {
    res.status(500).json({ status: "error", message: "Failed to fetch posts" });
  }
});

app.post("/blogs/create", async (req, res) => {
  const { title, content, author, category, externalLink } = req.body;
  if (!title || !content || !author || !category) {
    return res.status(400).json({ status: "error", message: "Please fill all the required fields" });
  }
  try {
    const newBlog = new Blog({ title, content, author, category, externalLink });
    await newBlog.save();
    res.status(201).json({ status: "success", message: "Blog created successfully", data: newBlog });
  } catch (error) {
    res.status(500).json({ status: "error", message: "Error creating blog, please try again" });
  }
});

app.get("/blogs", async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    res.status(200).json({ status: "success", data: blogs });
  } catch (error) {
    res.status(500).json({ status: "error", message: "Error fetching blogs" });
  }
});

app.post("/contact", async (req, res) => {
  const { name, email, phone, message } = req.body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ status: "error", message: "Invalid email address provided" });
  }

  const userMailOptions = {
    from: "madhavan8610331381@gmail.com",
    to: email,
    subject: "Contact Form Submission Confirmation",
    text: `Hello ${name},\n\nThank you for contacting Recipe Management App.\n\nWe have received your message:\n\nName: ${name}\nPhone: ${phone}\n\nYour Message:\n${message || "No message provided"}\n\nWe will review your submission and respond soon.\n\nBest regards,\nRecipe Management Team`,
  };

  const adminMailOptions = {
    from: "madhavan8610331381@gmail.com",
    to: "madhavan8610331381@gmail.com",
    subject: `New Contact Form Submission from ${name}`,
    text: `Name: ${name}\nEmail: ${email}\nPhone: ${phone}\nMessage:\n${message || "No message provided"}`,
  };

  try {
    await transporter.sendMail(userMailOptions);
    await transporter.sendMail(adminMailOptions);
    res.status(200).json({ status: "success", message: "Contact form submission successful" });
  } catch (error) {
    res.status(500).json({ status: "error", message: "Error sending email" });
  }
});

app.delete("/post/:id", async (req, res) => {
  try {
    const result = await Post.findByIdAndDelete(req.params.id);
    if (!result) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }
    res.json({ success: true, message: "Post deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete post" });
  }
});

app.put("/post/:id", async (req, res) => {
  try {
    const { title, content } = req.body;
    if (!title || !content) {
      return res.status(400).json({ success: false, message: "Title and content are required" });
    }
    const updatedPost = await Post.findByIdAndUpdate(
      req.params.id,
      { title, content, updatedAt: new Date() },
      { new: true }
    );
    if (!updatedPost) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }
    res.json({ success: true, message: "Post updated successfully", post: updatedPost });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update post" });
  }
});

app.get("/api/all-users", async (req, res) => {
  try {
    const users = await User.find({}, "username");
    res.status(200).json({
      status: "success",
      count: users.length,
      users: users.map((u) => u.username),
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: "Failed to fetch users" });
  }
});

app.listen(4000, () => {
  console.log("Server is running on port 4000");
});
