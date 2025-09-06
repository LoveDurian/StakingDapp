import express from "express";
import cors from "cors";

const app = express();
const port = 8888;

app.use(cors());
app.use(express.json());

// 健康检查端点
app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "OK", 
    message: "Backend server is running",
    timestamp: new Date().toISOString()
  });
});

// 启动服务器
app.listen(port, () => {
  console.log(`Backend server is running on port ${port}`);
  console.log("Note: Wallet balance is now queried directly from the blockchain");
});
