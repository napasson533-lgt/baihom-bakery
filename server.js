const express=require("express");
const http=require("http");
const {Server}=require("socket.io");
const {Pool}=require("pg");
const cookieParser=require("cookie-parser");

const app=express(), server=http.createServer(app), io=new Server(server);
const PORT=process.env.PORT||3000;
const ADMIN_PASSWORD=process.env.ADMIN_PASSWORD||"change-this-password";

if(!process.env.DATABASE_URL) console.warn("WARNING: DATABASE_URL is not set. Add a persistent PostgreSQL database before production use.");
const pool=new Pool({
  connectionString:process.env.DATABASE_URL,
  ssl:process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("localhost") ? {rejectUnauthorized:false}:false
});

app.use(express.json({limit:"1mb"})); app.use(cookieParser());
app.use(express.static(__dirname));

async function initDb(){
 if(!process.env.DATABASE_URL) return;
 await pool.query(`CREATE TABLE IF NOT EXISTS orders(
   id TEXT PRIMARY KEY, customer_name TEXT NOT NULL, phone TEXT NOT NULL,
   address TEXT DEFAULT '', note TEXT DEFAULT '', items JSONB NOT NULL,
   total NUMERIC NOT NULL, status TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 )`);
}
function admin(req){return req.cookies.baihom_admin==="1"}

app.post("/api/admin/login",(req,res)=>{
 if(req.body.password===ADMIN_PASSWORD){res.cookie("baihom_admin","1",{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",maxAge:86400000});return res.json({ok:true})}
 res.status(401).json({error:"รหัสผ่านไม่ถูกต้อง"});
});
app.post("/api/admin/logout",(req,res)=>{res.clearCookie("baihom_admin");res.json({ok:true})});

app.get("/api/orders",async(req,res)=>{
 if(!admin(req)) return res.status(401).json({error:"ต้องเข้าสู่ระบบแอดมิน"});
 if(!process.env.DATABASE_URL) return res.json([]);
 const {rows}=await pool.query("SELECT id,customer_name AS \"customerName\",phone,address,note,items,total,status,created_at AS \"createdAt\" FROM orders ORDER BY created_at DESC");
 res.json(rows);
});

app.post("/api/orders",async(req,res)=>{
 if(!process.env.DATABASE_URL) return res.status(503).json({error:"ยังไม่ได้เชื่อมต่อฐานข้อมูลถาวร"});
 const b=req.body||{};
 if(!b.customerName||!b.phone||!Array.isArray(b.items)||!b.items.length) return res.status(400).json({error:"ข้อมูลออเดอร์ไม่ครบ"});
 const id="BH-"+Date.now().toString().slice(-8);
 const order={id,customerName:b.customerName,phone:b.phone,address:b.address||"",note:b.note||"",items:b.items,total:Number(b.total||0),status:"รอรับออเดอร์",createdAt:new Date().toISOString()};
 await pool.query("INSERT INTO orders(id,customer_name,phone,address,note,items,total,status,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",
   [id,order.customerName,order.phone,order.address,order.note,JSON.stringify(order.items),order.total,order.status,order.createdAt]);
 io.to("admins").emit("new-order",order);
 res.status(201).json(order);
});

app.patch("/api/orders/:id",async(req,res)=>{
 if(!admin(req)) return res.status(401).json({error:"ต้องเข้าสู่ระบบแอดมิน"});
 if(!process.env.DATABASE_URL) return res.status(503).json({error:"ยังไม่ได้เชื่อมต่อฐานข้อมูล"});
 const allowed=["รอรับออเดอร์","กำลังเตรียม","พร้อมรับ","จัดส่งแล้ว","ยกเลิก"];
 if(!allowed.includes(req.body.status)) return res.status(400).json({error:"สถานะไม่ถูกต้อง"});
 const {rows}=await pool.query("UPDATE orders SET status=$1 WHERE id=$2 RETURNING id,customer_name AS \"customerName\",phone,address,note,items,total,status,created_at AS \"createdAt\"",[req.body.status,req.params.id]);
 if(!rows[0]) return res.status(404).json({error:"ไม่พบออเดอร์"});
 io.emit("order-updated",rows[0]); res.json(rows[0]);
});

io.on("connection",s=>s.on("admin-join",()=>s.join("admins")));

app.get("/admin",(req,res)=>res.sendFile(__dirname+"/public/index.html"));
app.get("*",(req,res)=>res.sendFile(__dirname+"/public/index.html"));

initDb().then(()=>server.listen(PORT,()=>console.log("BaiHom Bakery on "+PORT))).catch(e=>{console.error(e);process.exit(1)});

process.on("SIGTERM",async()=>{await pool.end();process.exit(0)});