const fs   = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const FILE = path.join(__dirname, '..', 'mycofarm.json');

class DB {
  constructor() {
    if (fs.existsSync(FILE)) {
      this.d = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    } else {
      this._seed();
    }
  }

  _save() { fs.writeFileSync(FILE, JSON.stringify(this.d, null, 2)); }

  _nextId(t) { this.d.seq[t] = (this.d.seq[t]||0)+1; return this.d.seq[t]; }

  _seed() {
    const h = p => bcrypt.hashSync(p, 10);
    const now = () => new Date().toISOString();
    this.d = {
      seq: { users:3, rooms:4, alerts:5, log:0 },
      users: [
        { id:1, username:'admin',   email:'admin@mycofarm.com',   password:h('admin123'),   role:'admin',   created_at:now(), last_login:null },
        { id:2, username:'manager', email:'manager@mycofarm.com', password:h('manager123'), role:'manager', created_at:now(), last_login:null },
        { id:3, username:'viewer',  email:'viewer@mycofarm.com',  password:h('viewer123'),  role:'viewer',  created_at:now(), last_login:null },
      ],
      rooms: [
        { id:1, name:'Room A', species:'Pleurotus ostreatus',  status:'growing',     start_date:'2026-04-13', total_days:21, target_temp:22, target_humidity:88, notes:null, created_at:now() },
        { id:2, name:'Room B', species:'Lentinula edodes',     status:'fruiting',    start_date:'2026-04-07', total_days:25, target_temp:19, target_humidity:85, notes:null, created_at:now() },
        { id:3, name:'Room C', species:'Hericium erinaceus',   status:'inoculation', start_date:'2026-04-22', total_days:28, target_temp:23, target_humidity:90, notes:null, created_at:now() },
        { id:4, name:'Room D', species:null,                   status:'idle',        start_date:null,         total_days:21, target_temp:22, target_humidity:85, notes:null, created_at:now() },
      ],
      alerts: [
        { id:1, type:'danger',  title:'CO₂ spike in Room B',          detail:'CO₂ reached 1,240 ppm — fan activated automatically.',      room_id:2, resolved:0, created_at:now(), resolved_at:null, resolved_by:null },
        { id:2, type:'warning', title:'Humidity dropped in Room B',   detail:'Humidity fell to 79%, below threshold. Misting triggered.', room_id:2, resolved:0, created_at:now(), resolved_at:null, resolved_by:null },
        { id:3, type:'warning', title:'Sensor battery low — TEMP-A03',detail:'Battery at 12%. Replace within 48 hours.',                  room_id:1, resolved:0, created_at:now(), resolved_at:null, resolved_by:null },
        { id:4, type:'info',    title:'Room C inoculation started',   detail:"Lion's Mane batch successfully inoculated.",                room_id:3, resolved:0, created_at:now(), resolved_at:null, resolved_by:null },
        { id:5, type:'success', title:'Room A harvest approaching',   detail:'Oyster mushrooms on track for May 4.',                      room_id:1, resolved:0, created_at:now(), resolved_at:null, resolved_by:null },
      ],
      log: [],
    };
    this._save();
  }

  // ── Users ──────────────────────────────────────────────────────────────────
  getUsers()          { return this.d.users.map(u => ({...u})); }
  getUserById(id)     { return this.d.users.find(u => u.id === +id); }
  getUserByName(name) { return this.d.users.find(u => u.username === name); }
  createUser(data)    {
    if (this.d.users.find(u => u.username===data.username || u.email===data.email)) return null;
    const u = { id: this._nextId('users'), ...data, created_at: new Date().toISOString(), last_login: null };
    this.d.users.push(u); this._save(); return u;
  }
  updateUserRole(id, role)  { const u=this.d.users.find(u=>u.id===+id); if(u){u.role=role; this._save();} }
  updateLastLogin(id)       { const u=this.d.users.find(u=>u.id===+id); if(u){u.last_login=new Date().toISOString(); this._save();} }
  updatePassword(id, hash)  { const u=this.d.users.find(u=>u.id===+id); if(u){u.password=hash; this._save();} }
  deleteUser(id)            { this.d.users=this.d.users.filter(u=>u.id!==+id); this._save(); }

  // ── Rooms ──────────────────────────────────────────────────────────────────
  getRooms()       { return this.d.rooms.map(r => ({...r})); }
  getRoomById(id)  { return this.d.rooms.find(r => r.id === +id); }
  createRoom(data) {
    const r = { id: this._nextId('rooms'), ...data, created_at: new Date().toISOString() };
    this.d.rooms.push(r); this._save(); return r;
  }
  updateRoom(id, data) { const r=this.d.rooms.find(r=>r.id===+id); if(r){Object.assign(r,data); this._save();} }
  deleteRoom(id)       { this.d.rooms=this.d.rooms.filter(r=>r.id!==+id); this._save(); }

  // ── Alerts ────────────────────────────────────────────────────────────────
  getAlerts()          { return [...this.d.alerts].sort((a,b)=>b.id-a.id); }
  getActiveAlerts(n)   { const a=this.d.alerts.filter(a=>!a.resolved).sort((a,b)=>b.id-a.id); return n?a.slice(0,n):a; }
  resolveAlert(id, by) {
    const a=this.d.alerts.find(a=>a.id===+id);
    if(a){a.resolved=1;a.resolved_at=new Date().toISOString();a.resolved_by=by; this._save();}
  }

  // ── Activity Log ─────────────────────────────────────────────────────────
  getLogs(n)            { const l=[...this.d.log].sort((a,b)=>b.id-a.id); return n?l.slice(0,n):l; }
  getUserLogs(uid, n)   { const l=this.d.log.filter(l=>l.user_id===+uid).sort((a,b)=>b.id-a.id); return n?l.slice(0,n):l; }
  log(userId, username, action, detail) {
    const e = { id: this._nextId('log'), user_id:userId, username, action, detail:detail||null, created_at:new Date().toISOString() };
    this.d.log.push(e);
    if (this.d.log.length > 1000) this.d.log = this.d.log.slice(-1000);
    this._save(); return e;
  }
}

module.exports = new DB();
