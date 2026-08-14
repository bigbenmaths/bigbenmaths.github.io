# AI handoff — bigbenmaths.github.io

บันทึกนี้สำหรับเอไอที่มาทำต่อ ไม่ต้องให้เจ้าของเล่าใหม่ทั้งก้อน  
เจ้าของคือครูอาทิตย์ อีเมล `bigbenmaths@gmail.com`

## โปรเจกต์นี้คืออะไร

เว็บส่วนตัวบน GitHub Pages สำหรับตารางหุ้น / คู่มือ XD  
ต้องล็อกอินก่อนเข้าทุกหน้า ไม่ใช่เว็บสาธารณะ

- หน้าแรก: https://bigbenmaths.github.io
- หน้าอนุมัติสิทธิ์: https://bigbenmaths.github.io/pending.html
- คู่มือ HMPRO + EGCO: https://bigbenmaths.github.io/hmpro-egco-xd/

## Repo ที่เกี่ยวข้อง

มี 2 repo คนละอัน อย่าปน

| งาน | path เครื่องเจ้าของ | remote | URL |
|---|---|---|---|
| หน้าแรก + ตารางหุ้น + login | `/Users/artasb/bigbenmaths.github.io` | `git@github-bigben:bigbenmaths/bigbenmaths.github.io.git` | `/` |
| คู่มือ HMPRO/EGCO | `/Users/artasb/hmpro-egco-xd` | `git@github-bigben:bigbenmaths/hmpro-egco-xd.git` | `/hmpro-egco-xd/` |

Push ผ่าน SSH host `github-bigben` บัญชี `bigbenmaths`  
GitHub Pages ใช้ Deploy from branch `main` ที่ root

แก้ `auth.js` แล้วต้อง bump query `?v=` ในทุก HTML ทั้งสอง repo ไม่เช่นนั้นมือถือยังใช้สคริปต์เก่า

## ล็อกอิน

ไฟล์หลัก: `auth.js`

- Firebase project: `bigbentutor-com` (โปรเจกต์เดิมของโรงเรียน ใช้ร่วม อย่าสร้างโปรเจกต์ใหม่)
- Auth domain: `bigbentutor-com.firebaseapp.com`
- Google: `signInWithPopup` เท่านั้น ห้าม redirect — GitHub Pages + Chrome จะเจอ missing initial state
- LINE: OIDC provider `oidc.line` ใน LINE in-app ใช้ `signInWithRedirect` เพราะ popup ไม่นิ่ง
- ใน LINE in-app ใช้ Google ไม่ได้ (WebView บล็อก)
- LINE Callback URL ที่ต้องมีใน LINE Developers: `https://bigbentutor-com.firebaseapp.com/__/auth/handler`
- Authorized domain ใน Firebase ต้องมี `bigbenmaths.github.io`
- ห้ามใส่ LINE client secret ใน frontend

## ใครเข้าได้

บัญชีถาวรในโค้ด `auth.js` ลบจากหน้าเว็บไม่ได้

- Google: `bigbenmaths@gmail.com`
- LINE ID: `U78834db84391fd380b5c1d3de33db1c0`
- Firebase UID ของ LINE เจ้าของ: `saLW92gjCYfmzaScQYUnoym1ZHf2`
- ชื่อ LINE: `KruArthit@BigBen`

คนอื่นต้องอยู่ใน Firestore `bb_pages_allowed`

## คนใหม่ขอสิทธิ์ยังไง

1. คนใหม่แค่ลองล็อกอิน ไม่ต้องก็อป LINE ID
2. `auth.js` เขียนคำขอลง `bb_pages_requests/{uid}`
3. เจ้าของเปิด `pending.html` ด้วย **Google `bigbenmaths@gmail.com` เท่านั้น**
4. กดอนุมัติ → เขียน `bb_pages_allowed` ทั้ง `{uid}` และ `{lineUid}` แล้วลบคำขอ
5. คนใหม่ล็อกอินอีกครั้งแล้วเข้าได้

สถานะใน `bb_pages_allowed.status`

- `active` หรือไม่มีฟิลด์ = เข้าได้
- `paused` = ยังอยู่ในรายการ แต่เข้าไม่ได้ ขึ้นว่าบัญชีถูกหยุดชั่วคราว ไม่สร้างคำขอใหม่
- ยกเลิก = ลบเอกสารออกจาก `bb_pages_allowed` ถ้าจะเข้าใหม่ต้องขออนุมัติอีกครั้ง

หน้า `pending.html` แยก 2 บล็อก: คำขอเข้าใช้งาน / ไวท์ลิสต์  
ฟังก์ชันไวท์ลิสต์: ดู, อนุมัติ, หยุดชั่วคราว, เปิดใช้ต่อ, ยกเลิก  
การ์ดคำขอบนหน้าแรกโชว์เฉพาะตอนล็อกอินด้วยอีเมลเจ้าของ

## Firestore — สำคัญมาก

ใช้ database ของโปรเจกต์ `bigbentutor-com`  
มีของโรงเรียนอยู่แล้ว (`longdv_*`, `student_*`) **ห้ามทับกฎทั้งก้อน** ต้อง merge เท่านั้น

กฎล่าสุดอยู่ที่เครื่อง: `/tmp/bb_pages_firestore.rules` และ `/tmp/bb-pages-rules/`  
deploy ด้วย

```bash
cd /tmp/bb-pages-rules
firebase deploy --only firestore:rules --project bigbentutor-com --non-interactive
```

กฎที่เกี่ยวกับเว็บนี้

- `bb_pages_requests`: คนล็อกอินสร้าง/อัปเดตเอกสารของตัวเองได้ เจ้าของ (อีเมล `bigbenmaths@gmail.com`) อ่าน/ลบได้
- `bb_pages_allowed`: คนที่ล็อกอินอ่านได้ เจ้าของอีเมลนี้เท่านั้นที่เขียนได้
- `isPagesOwner()` ตรวจเฉพาะ `request.auth.token.email == 'bigbenmaths@gmail.com'` ไม่ใช้ LINE UID

อย่าให้บัญชี LINE ของเจ้าของมาอนุมัติได้ เจ้าของต้องการล็อกหน้าจัดการด้วย Google อีเมลเดียว

## หน้าหุ้นที่มีแล้ว

ข้อมูลราคาต่ำสุด–สูงสุดตรวจจาก Yahoo daily ถึง 14 ส.ค. 2569

- `kce-hana.html`
- `pttgc-irpc.html`
- `mtc-sawad-tidlor.html` — SAWAD ใช้ราคา as-traded หลังหุ้นปันผล 11:10 สองรอบ อย่าใช้ซีรีส์ปรับแล้วมั่วๆ
- `psl-rcl-tta.html`
- `cpf-gfpt-tfg.html`
- `/hmpro-egco-xd/` — คู่มือ XD ไม่ใช่ตาราง high-low

หมายเหตุ TIDLOR: Yahoo ของ TIDLOR Holdings มีข้อมูลตั้งแต่ 16 พ.ค. 2025

SET API โดน Incapsula 403 อย่าพึ่งมันเป็นแหล่งหลัก

## ข้อห้ามที่เคยเจ็บมาแล้ว

- อย่าใช้ Google `signInWithRedirect` บน github.io
- อย่าให้ LINE login แล้วยังค้างหน้าขาวของ Firebase auth handler
- อย่าให้หน้า unauthorized โชว์กล่องให้ก็อป LINE ID อีก
- อย่า deploy Firestore rules แบบแทนที่ของโรงเรียน
- อย่าสร้าง Firebase โปรเจกต์ใหม่
- หน้า `pending.html` เข้าได้เฉพาะ `bigbenmaths@gmail.com`

## เวลาเจ้าของกลับมา

เปิด repo นี้ อ่านไฟล์นี้ แล้วดู git log ล่าสุด  
ไม่ต้องถามเจ้าของซ้ำเรื่องที่เขียนไว้ ยกเว้นจะเปลี่ยนนโยบาย
