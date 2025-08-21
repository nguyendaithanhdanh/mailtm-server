const express = require("express");
const axios = require("axios");

const app = express();
const PORT = 3000;

// Hàm delay (chờ)
const delay = ms => new Promise(res => setTimeout(res, ms));

// Hàm lấy code từ mail.tm
async function getMailTmCode(email, password, timeout = 30000) {
  try {
    // 1. Login để lấy token
    const loginRes = await axios.post("https://api.mail.tm/token", {
      address: email,
      password
    });
    const token = loginRes.data.token;
    if (!token) throw new Error("Login thất bại");

    const startTime = Date.now();
    let code = null;

    // 2. Polling chờ mail mới
    while (!code && Date.now() - startTime < timeout) {
      const msgsRes = await axios.get("https://api.mail.tm/messages", {
        headers: { Authorization: `Bearer ${token}` }
      });

      const messages = msgsRes.data["hydra:member"];
      if (messages.length > 0) {
        // Lấy email mới nhất
        const msgId = messages[0].id;
        const msgRes = await axios.get(`https://api.mail.tm/messages/${msgId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const text = msgRes.data.text || "";

        // Regex tìm mã dạng 6 ký tự chữ + số liền nhau
    

        const match = text.match(/\b[A-Z0-9]{6}\b/);
        if (match) {
          code = match[0];
          break;
        }
      }

      // Chưa có code, chờ 5s rồi thử lại
      await delay(5000);
    }

    return code; // có thể là null nếu hết thời gian
  } catch (err) {
    console.error("Lỗi khi lấy code:", err.response?.data || err.message);
    return null;
  }
}

// -------------------
// Route API
app.get("/getcode", async (req, res) => {
  const { account, pass } = req.query;
  if (!account || !pass) {
    return res.status(400).json({ error: "Thiếu account hoặc pass" });
  }

  const code = await getMailTmCode(account, pass, 30000); // timeout 30s
  if (code) {
    res.json({ code });
  } else {
    res.json({ code: null, message: "Không tìm thấy code trong 30s" });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server chạy tại http://localhost:${PORT}`);
});
