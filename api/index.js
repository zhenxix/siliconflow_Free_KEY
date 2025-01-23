const express = require('express');
const path = require('path');
const fs = require('fs').promises;

const app = express();

// 文件路径 - 使用相对路径
const KEYS_FILE = path.join(process.cwd(), 'data/keys.json');
const USAGE_FILE = path.join(process.cwd(), 'data/usage.json');

// 确保数据目录存在
async function ensureDataDir() {
    const dataDir = path.join(process.cwd(), 'data');
    try {
        await fs.mkdir(dataDir, { recursive: true });
    } catch (error) {
        if (error.code !== 'EEXIST') {
            console.error('Error creating data directory:', error);
        }
    }
}

// 读取密钥
async function loadKeys() {
    try {
        const data = await fs.readFile(KEYS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            // 如果文件不存在，创建一个空数组
            await fs.writeFile(KEYS_FILE, '[]');
            return [];
        }
        throw error;
    }
}

// 其他函数保持不变...

// API 路由
module.exports = async (req, res) => {
    await ensureDataDir();

    // CORS 设置
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { pathname } = new URL(req.url, `http://${req.headers.host}`);

    switch (pathname) {
        case '/api/get-key':
            if (req.method === 'POST') {
                try {
                    const keys = await loadKeys();
                    if (keys.length === 0) {
                        return res.status(404).json({ error: '密钥已用完' });
                    }

                    const randomIndex = Math.floor(Math.random() * keys.length);
                    const selectedKey = keys[randomIndex];
                    keys.splice(randomIndex, 1);
                    await fs.writeFile(KEYS_FILE, JSON.stringify(keys, null, 2));

                    const todayUsage = await updateUsage();
                    res.json({ key: selectedKey, todayUsage });
                } catch (error) {
                    console.error('Error:', error);
                    res.status(500).json({ error: '服务器错误' });
                }
            }
            break;

        case '/api/verify-key':
            // 验证密钥的处理...
            break;

        case '/api/key-count':
            if (req.method === 'GET') {
                try {
                    const keys = await loadKeys();
                    res.json({ count: keys.length });
                } catch (error) {
                    console.error('Error:', error);
                    res.status(500).json({ error: '服务器错误' });
                }
            }
            break;

        case '/api/usage-stats':
            if (req.method === 'GET') {
                try {
                    const usage = await loadUsage();
                    res.json(usage);
                } catch (error) {
                    console.error('Error:', error);
                    res.status(500).json({ error: '服务器错误' });
                }
            }
            break;

        default:
            res.status(404).json({ error: 'Not found' });
    }
}; 