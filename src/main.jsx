import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Plus, Search, CheckCircle2, UserRound, MapPin, Gauge, X, Clock3, LogOut } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import './styles.css';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const newFolders = ['ГАУ/1', 'ГАУ/2', 'ГАУ/3', 'ГАУ/4', 'ГАУ/5', 'ГАУ/6', 'ГАУ/7', 'ГазИнвест', 'Юридический'];
  const [form, setForm] = useState({ address: '', personal_account: '', client: '', phone: '', phone2: '', phone3: '', meter: '', model: '', last_verification_date: '', comment: '', folder: 'ГАУ/1' });
  const [completeId, setCompleteId] = useState(null);
  const [detailItem, setDetailItem] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [editBusy, setEditBusy] = useState(false);
  const [completeForm, setCompleteForm] = useState({ result: '', readings: '', worker_comment: '', photo: null, verification_status: '' });
  const [selectedStatus, setSelectedStatus] = useState('new');
  const [collapsedDoneDates, setCollapsedDoneDates] = useState({});
  const [collapsedNewFolders, setCollapsedNewFolders] = useState(() => ({
    'ГАУ/1': true,
    'ГАУ/2': true,
    'ГАУ/3': true,
    'ГАУ/4': true,
    'ГАУ/5': true,
    'ГАУ/6': true,
    'ГАУ/7': true,
    'ГазИнвест': true,
    'Юридический': true
  }));
  const [showReport, setShowReport] = useState(false);
  const [reportFrom, setReportFrom] = useState('');
  const [reportTo, setReportTo] = useState('');
  const [reportDateType, setReportDateType] = useState('completed');
  const [contactId, setContactId] = useState(null);
  const [contactBusy, setContactBusy] = useState(false);
  const [showEmployees, setShowEmployees] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [employeeForm, setEmployeeForm] = useState({ full_name: '', phone: '', role: 'worker', email: '' });
  const [employeeBusy, setEmployeeBusy] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const statusText = { new: 'Новая', working: 'В работе', done: 'Выполнена', archive: 'Архив' };

  useEffect(() => {
    let active = true;
    async function init() {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setSession(data.session);
      if (data.session?.user) await loadProfile(data.session.user.id);
      setAuthLoading(false);
    }
    init();
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession);
      if (nextSession?.user) await loadProfile(nextSession.user.id);
      else { setProfile(null); setItems([]); }
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  async function loadProfile(userId) {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (error) { console.error(error); setProfile(null); return; }
    setProfile(data);
  }

  async function login() {
    setAuthError('');
    if (!email || !password) { setAuthError('Введите email и пароль'); return; }
    setAuthBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { console.error(error); setAuthError('Неверный email или пароль'); }
    setAuthBusy(false);
  }

  async function logout() { await supabase.auth.signOut(); }

  async function loadEmployees() {
    if (!isManagerProfile()) return;
    setEmployeeBusy(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id,full_name,phone,role')
      .order('full_name', { ascending: true });
    setEmployeeBusy(false);
    if (error) {
      console.error('loadEmployees:', error);
      alert('Не удалось загрузить сотрудников. Проверьте права RLS для таблицы profiles.\n\n' + (error.message || 'Неизвестная ошибка'));
      return;
    }
    setEmployees(data || []);
  }

  function isManagerProfile() {
    return profile?.role === 'manager';
  }

  async function addEmployee() {
    alert('Новые логины создаются через Supabase Auth. В этом разделе руководитель управляет уже зарегистрированными пользователями.');
  }

  async function saveEmployee() {
    if (!editingEmployee) return;
    if (!isManagerProfile()) {
      alert('Изменять сотрудников может только руководитель.');
      return;
    }
    if (!editingEmployee.full_name.trim()) {
      alert('Укажите ФИО сотрудника');
      return;
    }
    if (!['worker', 'manager'].includes(editingEmployee.role)) {
      alert('Выберите корректную роль');
      return;
    }

    setEmployeeBusy(true);
    const payload = {
      full_name: editingEmployee.full_name.trim(),
      phone: editingEmployee.phone?.trim() || null,
      role: editingEmployee.role
    };
    const { data, error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', editingEmployee.id)
      .select('id,full_name,phone,role')
      .single();
    setEmployeeBusy(false);

    if (error) {
      console.error('saveEmployee:', error);
      alert('Не удалось сохранить данные сотрудника. Проверьте права RLS для таблицы profiles.\n\n' + (error.message || 'Неизвестная ошибка'));
      return;
    }

    setEmployees(prev => prev.map(item => item.id === data.id ? data : item));
    if (profile.id === data.id) setProfile(data);
    setEditingEmployee(null);
  }

  async function loadRequests() {
    setLoading(true); setError('');
    const { data, error } = await supabase.from('requests').select('*').order('created_at', { ascending: false });
    if (error) { console.error(error); setError('Не удалось загрузить заявки из базы'); setLoading(false); return; }
    setItems(data || []); setLoading(false);
  }

  useEffect(() => { if (session && profile) loadRequests(); }, [session, profile]);

  function formatReportDate(value) {
    if (!value) return '';
    return new Date(value).toLocaleDateString('ru-RU');
  }

  function getReportItems() {
    const from = reportFrom ? new Date(reportFrom + 'T00:00:00') : null;
    const to = reportTo ? new Date(reportTo + 'T23:59:59.999') : null;
    return items.filter(item => {
      const rawDate = reportDateType === 'completed' ? item.completed_at : item.created_at;
      if (!rawDate) return false;
      const d = new Date(rawDate);
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    });
  }

  function exportReport() {
    const reportItems = getReportItems();
    if (!reportItems.length) {
      alert('За выбранный период заявок нет');
      return;
    }
    const rows = reportItems.map((x, index) => ({
      '№': x.request_number || index + 1,
      'Дата создания': formatReportDate(x.created_at),
      'Дата выполнения': formatReportDate(x.completed_at),
      'Статус': x.status || '',
      'Проверка': x.verification_status || '',
      'Адрес': x.address || '',
      'Абонент': x.client_name || '',
      'Телефон 1': x.phone || '',
      'Телефон 2': x.phone2 || '',
      'Телефон 3': x.phone3 || '',
      'Номер счётчика': x.meter_number || '',
      'Модель': x.meter_model || '',
      'Исполнитель': x.taken_by || '',
      'Статус связи': x.contact_status || '',
      'Дата/время связи': x.contact_status_at ? new Date(x.contact_status_at).toLocaleString('ru-RU') : '',
      'История связи': Array.isArray(x.contact_history) ? x.contact_history.map(h => `${h.status} — ${new Date(h.at).toLocaleString('ru-RU')}${h.worker ? ` — ${h.worker}` : ''}`).join('\n') : '',
      'Результат проверки': x.result || '',
      'Показания счётчика': x.readings || '',
      'Комментарий руководителя': x.comment || '',
      'Комментарий работника': x.worker_comment || ''
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
      { wch: 28 }, { wch: 24 }, { wch: 18 }, { wch: 18 }, { wch: 18 },
      { wch: 22 }, { wch: 35 }, { wch: 20 }, { wch: 35 }, { wch: 35 }
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Отчет');
    const fromName = reportFrom || 'все';
    const toName = reportTo || 'все';
    XLSX.writeFile(wb, `Отчет_Газовый_контроль_${fromName}_${toName}.xlsx`);
  }

  function convertStatus(status) {
    if (status === 'Новая') return 'new';
    if (status === 'В работе') return 'working';
    if (status === 'Выполнена') return 'done';
    if (status === 'Архив') return 'archive';
    return status;
  }

  const filtered = items.filter(x => `${x.request_number || ''} ${x.id || ''} ${x.address || ''} ${x.personal_account || ''} ${x.client_name || ''} ${x.phone || ''} ${x.phone2 || ''} ${x.phone3 || ''} ${x.meter_number || ''}`.toLowerCase().includes(q.toLowerCase()));

  async function createRequest() {
    if (!form.address || !form.personal_account || !form.client || !form.meter) { alert('Заполните адрес, лицевой счёт, ФИО абонента и номер счётчика'); return; }
    if (!form.folder) { alert('Выберите папку для заявки'); return; }
    const { error } = await supabase.from('requests').insert({
      address: form.address, personal_account: form.personal_account, client_name: form.client, phone: form.phone, phone2: form.phone2 || null, phone3: form.phone3 || null,
      meter_number: form.meter, meter_model: form.model, last_verification_date: form.last_verification_date || null,
      comment: form.comment, folder: form.folder, status: 'Новая'
    });
    if (error) { console.error(error); alert('Ошибка при создании заявки'); return; }
    setForm({ address: '', personal_account: '', client: '', phone: '', phone2: '', phone3: '', meter: '', model: '', last_verification_date: '', comment: '', folder: 'ГАУ/1' });
    setShow(false); await loadRequests();
  }

  async function updateRequest() {
    if (!editItem) return;
    if (!editItem.address || !editItem.personal_account || !editItem.client_name || !editItem.meter_number) {
      alert('Заполните адрес, лицевой счёт, ФИО абонента и номер счётчика');
      return;
    }
    setEditBusy(true);
    const { data, error } = await supabase.from('requests').update({
      address: editItem.address,
      personal_account: editItem.personal_account || null,
      client_name: editItem.client_name,
      phone: editItem.phone || null,
      phone2: editItem.phone2 || null,
      phone3: editItem.phone3 || null,
      meter_number: editItem.meter_number,
      meter_model: editItem.meter_model || null,
      last_verification_date: editItem.last_verification_date || null,
      comment: editItem.comment || null
    }).eq('id', editItem.id).select();
    setEditBusy(false);
    if (error) {
      console.error(error);
      alert('Не удалось сохранить изменения');
      return;
    }
    if (!data || data.length === 0) {
      alert('Заявка не найдена или уже была изменена');
      return;
    }
    setEditItem(null);
    setDetailItem(data[0]);
    await loadRequests();
  }

  async function deleteRequest(id) {
    if (!window.confirm('Удалить эту заявку? Действие нельзя отменить.')) return;
    const { error } = await supabase.from('requests').delete().eq('id', id);
    if (error) {
      console.error(error);
      alert('Не удалось удалить заявку');
      return;
    }
    setDetailItem(null);
    await loadRequests();
  }

  async function takeRequest(id) {
    const { data, error } = await supabase.from('requests').update({
      status: 'В работе', taken_by: profile.full_name, taken_at: new Date().toISOString()
    }).eq('id', id).eq('status', 'Новая').select();
    if (error) { console.error(error); alert('Не удалось взять заявку в работу'); return; }
    if (!data || data.length === 0) { alert('Эту заявку уже взял другой работник'); await loadRequests(); return; }
    await loadRequests();
  }

  async function refuseService(id) {
    if (!window.confirm('Отказаться от услуг? Заявка будет перенесена в Архив и не будет удалена.')) return;

    const { data, error } = await supabase.from('requests').update({
      status: 'Архив'
    }).eq('id', id).eq('status', 'В работе').eq('taken_by', profile.full_name).select();

    if (error) {
      console.error(error);
      alert('Не удалось перенести заявку в архив');
      return;
    }

    if (!data || data.length === 0) {
      alert('Заявка уже была изменена');
      await loadRequests();
      return;
    }

    await loadRequests();
  }

  async function openPhoto(path) {
    const { data, error } = await supabase.storage.from('request-photos').createSignedUrl(path, 3600);
    if (error || !data?.signedUrl) { alert('Не удалось открыть фото'); return; }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  }

  async function markContactStatus(id, contactStatus) {
    setContactBusy(true);

    const current = items.find(item => item.id === id);
    const history = Array.isArray(current?.contact_history) ? current.contact_history : [];
    const historyEntry = {
      status: contactStatus,
      at: new Date().toISOString(),
      worker: profile.full_name
    };

    const nextHistory = [...history, historyEntry];

    const { data, error } = await supabase.from('requests').update({
      status: 'Новая',
      contact_status: contactStatus,
      contact_status_at: historyEntry.at,
      contact_history: nextHistory,
      taken_by: null,
      taken_at: null
    }).eq('id', id).eq('status', 'В работе').select();
    setContactBusy(false);

    if (error) {
      console.error(error);
      alert('Не удалось сохранить статус связи');
      return;
    }
    if (!data || data.length === 0) {
      alert('Заявка уже была изменена');
      await loadRequests();
      return;
    }

    setContactId(null);
    await loadRequests();
  }

  async function completeRequest(id) {
    let photoPath = null;
    if (completeForm.photo) {
      const ext = completeForm.photo.name.split('.').pop() || 'jpg';
      photoPath = `requests/${id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('request-photos').upload(photoPath, completeForm.photo, { upsert: false });
      if (uploadError) { console.error(uploadError); alert('Не удалось загрузить фото'); return; }
    }
    if (!completeForm.verification_status) {
      alert('Выберите результат проверки');
      return;
    }
    if (!completeForm.result.trim()) {
      alert('Укажите результат проверки');
      return;
    }

    const { data, error } = await supabase.from('requests').update({
      status: 'Выполнена',
      completed_at: new Date().toISOString(),
      result: completeForm.result.trim(),
      readings: completeForm.readings.trim() || null,
      worker_comment: completeForm.worker_comment.trim() || null,
      verification_status: completeForm.verification_status,
      photo_url: photoPath
    }).eq('id', id).eq('status', 'В работе').eq('taken_by', profile.full_name).select();

    if (error) { console.error(error); alert('Не удалось завершить заявку'); return; }
    if (!data || data.length === 0) { alert('Заявка уже была изменена'); await loadRequests(); return; }

    setCompleteId(null);
    setCompleteForm({ result: '', readings: '', worker_comment: '', photo: null, verification_status: '' });
    await loadRequests();
  }

  if (authLoading) return <div className="app"><div style={{padding:60,textAlign:'center'}}>Загрузка AGI...</div></div>;

  if (!session) return (
    <div className="app"><div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div className="modal" style={{width:'100%',maxWidth:420}}>
        <div style={{textAlign:'center',marginBottom:25}}><div className="logo" style={{margin:'0 auto 12px'}}>AGI</div><h2>Вход в AGI</h2><p>Газовый контроль</p></div>
        <input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input type="password" placeholder="Пароль" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>{if(e.key==='Enter') login();}} />
        {authError && <div style={{color:'#b42318',background:'#fef3f2',padding:10,borderRadius:8,marginBottom:12}}>{authError}</div>}
        <button className="primary wide" onClick={login} disabled={authBusy}>{authBusy ? 'Вход...' : 'Войти'}</button>
      </div></div></div>
  );

  if (!profile) return <div className="app"><div style={{padding:60,textAlign:'center'}}>Профиль пользователя не найден.<br/>Обратитесь к руководителю.<br/><button className="primary" style={{marginTop:20}} onClick={logout}>Выйти</button></div></div>;

  const isManager = profile.role === 'manager';
  const isWorker = profile.role === 'worker';

  return <div className="app">
    <header>
      <div className="brand"><div className="logo">AGI</div><div><b>AGI</b><small>Газовый контроль</small></div></div>
      <div style={{display:'flex',alignItems:'center',gap:12}}><div style={{textAlign:'right'}}><b>{profile.full_name}</b><small>{isManager ? 'Руководитель' : 'Работник'}</small></div>{isManager && <button type="button" onClick={()=>{setShowEmployees(true);loadEmployees();}}>👥 Сотрудники</button>}<button onClick={logout} title="Выйти"><LogOut size={18}/></button></div>
    </header>
    <main>
      <div className="top"><div><h1>{isManager ? 'Заявки на поверку' : 'Все заявки'}</h1><p>{isManager ? 'Создавайте и контролируйте заявки' : 'Общая очередь заявок для работников'}</p></div>{isManager && <div style={{display:'flex',gap:10,flexWrap:'wrap',justifyContent:'flex-end'}}><button type="button" onClick={()=>setShowReport(true)}>📊 Отчет и Excel</button><button className="primary" onClick={()=>setShow(true)}><Plus size={19}/>Новая заявка</button></div>}</div>
      <div className="stats" style={{
        display:'grid',
        gridTemplateColumns:'repeat(3,minmax(0,1fr))',
        gap:12,
        marginBottom:18
      }}>
        {[
          {
            key:'new',
            label:'НОВЫЕ',
            count:items.filter(x=>convertStatus(x.status)==='new').length,
            icon:'🆕',
            subtitle:'Заявки в очереди'
          },
          {
            key:'working',
            label:'В РАБОТЕ',
            count:items.filter(x=>convertStatus(x.status)==='working').length,
            icon:'🔵',
            subtitle:'Заявки, взятые работниками'
          },
          {
            key:'done',
            label:'ВЫПОЛНЕННЫЕ',
            count:items.filter(x=>convertStatus(x.status)==='done').length,
            icon:'✅',
            subtitle:'Завершённые заявки'
          },
          {
            key:'archive',
            label:'АРХИВ',
            count:items.filter(x=>convertStatus(x.status)==='archive').length,
            icon:'🗄️',
            subtitle:'Отказавшиеся и архивные заявки'
          }
        ].map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={()=>setSelectedStatus(tab.key)}
            style={{
              textAlign:'left',
              border:'2px solid '+(selectedStatus===tab.key ? '#182230' : '#e4e7ec'),
              background:selectedStatus===tab.key ? '#182230' : '#fff',
              color:selectedStatus===tab.key ? '#fff' : '#101828',
              borderRadius:16,
              padding:'18px 20px',
              cursor:'pointer',
              boxShadow:selectedStatus===tab.key ? '0 5px 16px rgba(16,24,40,.14)' : 'none',
              transition:'all .15s ease',
              minHeight:92
            }}
          >
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
              <span style={{fontWeight:800,fontSize:17}}>{tab.icon} {tab.label}</span>
              <strong style={{fontSize:30,lineHeight:1}}>{tab.count}</strong>
            </div>
            <span style={{
              display:'block',
              marginTop:8,
              fontSize:13,
              color:selectedStatus===tab.key ? 'rgba(255,255,255,.72)' : '#667085'
            }}>
              {tab.subtitle}
            </span>
          </button>
        ))}
      </div>
      <div className="search"><Search size={19}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Поиск по № заявки, адресу, лицевому счёту, абоненту, телефону или счётчику..."/></div>
      {loading && <div style={{padding:30,textAlign:'center'}}>Загрузка заявок...</div>}
      {error && <div style={{padding:30,textAlign:'center'}}>{error}</div>}
      {!loading && !error && (() => {
        const newItems = filtered.filter(x=>convertStatus(x.status)==='new');
        const workingItems = filtered
          .filter(x=>convertStatus(x.status)==='working')
          .sort((a,b)=>{
            const aMine = a.taken_by===profile.full_name ? 1 : 0;
            const bMine = b.taken_by===profile.full_name ? 1 : 0;
            return bMine-aMine;
          });
        const doneItems = filtered
          .filter(x=>convertStatus(x.status)==='done')
          .sort((a,b)=>{
            const da = a.completed_at ? new Date(a.completed_at).getTime() : 0;
            const db = b.completed_at ? new Date(b.completed_at).getTime() : 0;
            return db-da;
          });
        const archiveItems = filtered
          .filter(x=>convertStatus(x.status)==='archive')
          .sort((a,b)=>{
            const da = a.taken_at ? new Date(a.taken_at).getTime() : 0;
            const db = b.taken_at ? new Date(b.taken_at).getTime() : 0;
            return db-da;
          });
        const doneGroups = doneItems.reduce((groups, item) => {
          const key = item.completed_at ? new Date(item.completed_at).toLocaleDateString('ru-RU') : 'Дата не указана';
          if (!groups[key]) groups[key] = [];
          groups[key].push(item);
          return groups;
        }, {});
        const activeWorkerRequest = workingItems.find(x=>x.taken_by===profile.full_name);
        const renderCard = x => { const status=convertStatus(x.status); const isMyActiveRequest=isWorker && status==='working' && x.taken_by===profile.full_name; return <article className="card" key={x.id} style={isMyActiveRequest ? {border:'3px solid #2563eb',background:'#eff6ff',boxShadow:'0 8px 24px rgba(37,99,235,.18)',position:'relative'} : undefined}>
          {isMyActiveRequest && <div style={{marginBottom:10,padding:'8px 12px',borderRadius:9,background:'#2563eb',color:'#fff',fontWeight:800,textAlign:'center'}}>⭐ ВЫ ВЗЯЛИ ЭТУ ЗАЯВКУ</div>}
          <div className="cardtop"><span className={'status '+status}>{statusText[status] || x.status}</span><span>№ {x.request_number || x.id}</span></div>
          <h2><MapPin size={18}/>{x.address}</h2>
          <div className="grid"><div><small>Лицевой счёт</small><b>{x.personal_account || '—'}</b></div><div><small>Абонент</small><b>{x.client_name}</b></div><div><small>Телефон</small><b style={{display:'grid',gap:4}}>{[x.phone,x.phone2,x.phone3].filter(Boolean).length ? [x.phone,x.phone2,x.phone3].filter(Boolean).map((p,i)=><a key={i} href={`tel:${p.replace(/[^0-9+]/g,'')}`} style={{color:'#2563eb',textDecoration:'none'}} onClick={e=>e.stopPropagation()}>📞 {p}</a>) : '—'}</b></div><div><small>Счётчик</small><b><Gauge size={15}/>{x.meter_number}</b></div><div><small>Модель</small><b>{x.meter_model || '—'}</b></div><div><small>Дата последней поверки</small><b>{x.last_verification_date ? new Date(x.last_verification_date).toLocaleDateString('ru-RU') : '—'}</b></div></div>
          {x.taken_by && <div className="worker"><UserRound size={16}/>Исполнитель:<b>{x.taken_by}</b></div>}
          {x.contact_history?.length > 0 ? <div style={{marginTop:10,padding:'10px 12px',background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:10,fontSize:13,color:'#9a3412'}}>
            <b>📞 История связи</b>
            {x.contact_history.map((h,i)=><div key={i} style={{marginTop:5}}>
              {h.status} — {new Date(h.at).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}
              {h.worker ? ` — ${h.worker}` : ''}
            </div>)}
          </div> : x.contact_status && x.contact_status_at && <div style={{marginTop:10,padding:'9px 12px',background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:10,fontSize:13,fontWeight:700,color:'#9a3412'}}>
            📞 {x.contact_status} — {new Date(x.contact_status_at).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}
          </div>}
          {status==='done' && x.verification_status && <div style={{
            display:'inline-flex',
            alignItems:'center',
            marginTop:14,
            padding:'8px 14px',
            borderRadius:999,
            fontWeight:800,
            fontSize:14,
            background:x.verification_status==='Годен' ? '#dcfce7' : '#fee2e2',
            color:x.verification_status==='Годен' ? '#15803d' : '#b91c1c',
            border:'1px solid '+(x.verification_status==='Годен' ? '#86efac' : '#fca5a5')
          }}>
            {x.verification_status==='Годен' ? '✓ ГОДЕН' : '✕ НЕГОДЕН'}
          </div>}
          {status==='done' && (x.result || x.readings || x.worker_comment) && <div style={{marginTop:16,padding:14,background:'#f8fafc',borderRadius:10}}>
            <b style={{display:'block',marginBottom:8}}>Результат проверки</b>
            {x.result && <div><small>Результат</small><div>{x.result}</div></div>}
            {x.readings && <div style={{marginTop:8}}><small>Показания счётчика</small><div>{x.readings}</div></div>}
            {x.worker_comment && <div style={{marginTop:8}}><small>Комментарий работника</small><div>{x.worker_comment}</div></div>}
            {x.photo_url && <div style={{marginTop:10}}><small>Фото счётчика</small><div><button type="button" onClick={()=>openPhoto(x.photo_url)}>Открыть фото</button></div></div>}
          </div>}
          <div className="actions">{isWorker && status==='new' && <button className="primary" onClick={()=>takeRequest(x.id)}>Взять в работу</button>}{isWorker && status==='working' && x.taken_by===profile.full_name && <>
            <button type="button" onClick={()=>setContactId(x.id)}>📞 Не удалось связаться</button>
            <button type="button" onClick={()=>refuseService(x.id)} style={{background:'#fff7ed',color:'#c2410c',border:'1px solid #fed7aa'}}>🚫 Отказ от услуг</button>
            <button className="success" onClick={()=>{setCompleteId(x.id);setCompleteForm({result:'',readings:'',worker_comment:'',photo:null,verification_status:''});}}><CheckCircle2 size={17}/>Завершить проверку</button>
          </>}{isManager && <button type="button" onClick={()=>setDetailItem(x)}>Подробнее</button>}{isManager && <span className="date"><Clock3 size={15}/>Создана {x.created_at ? new Date(x.created_at).toLocaleDateString('ru-RU') : '—'}</span>}</div>
        </article>; };
        const section = (title, list, emptyText) => <section style={{marginTop:20}}>
          <div style={{
            display:'flex',
            alignItems:'center',
            justifyContent:'space-between',
            gap:12,
            marginBottom:12,
            padding:'4px 2px'
          }}>
            <div>
              <h2 style={{margin:0,fontSize:21}}>{title}</h2>
              <div style={{fontSize:13,color:'#667085',marginTop:3}}>
                {list.length ? `Показано заявок: ${list.length}` : 'Список пуст'}
              </div>
            </div>
            <span style={{
              minWidth:34,
              height:34,
              padding:'0 10px',
              display:'inline-flex',
              alignItems:'center',
              justifyContent:'center',
              borderRadius:18,
              background:'#f2f4f7',
              fontWeight:800,
              color:'#344054'
            }}>{list.length}</span>
          </div>
          {list.length ? <div className="cards">{list.map(renderCard)}</div> : <div style={{padding:26,textAlign:'center',background:'#f8fafc',borderRadius:12,color:'#667085'}}>{emptyText}</div>}
        </section>;
        if (selectedStatus === 'new') {
          const folderGroups = newFolders.map(folder => ({
            folder,
            list: newItems.filter(x => (x.folder || '') === folder)
          }));
          const unassignedNewItems = newItems.filter(x => !x.folder || !newFolders.includes(x.folder));

          return <section style={{marginTop:20}}>
            <div style={{
              display:'flex',
              alignItems:'center',
              justifyContent:'space-between',
              gap:12,
              marginBottom:12,
              padding:'4px 2px'
            }}>
              <div>
                <h2 style={{margin:0,fontSize:21}}>Новые заявки</h2>
                <div style={{fontSize:13,color:'#667085',marginTop:3}}>Папки: 9 · Всего новых заявок: {newItems.length}</div>
              </div>
              <span style={{minWidth:34,height:34,padding:'0 10px',display:'inline-flex',alignItems:'center',justifyContent:'center',borderRadius:18,background:'#f2f4f7',fontWeight:800,color:'#344054'}}>{newItems.length}</span>
            </div>

            {folderGroups.map(({folder,list}) => {
              const isCollapsed = !!collapsedNewFolders[folder];
              return <div key={folder} style={{marginBottom:12}}>
                <button
                  type="button"
                  onClick={()=>setCollapsedNewFolders(prev=>({...prev,[folder]:!prev[folder]}))}
                  style={{
                    width:'100%',
                    display:'flex',
                    alignItems:'center',
                    justifyContent:'space-between',
                    gap:12,
                    padding:'14px 16px',
                    background:'#fff',
                    border:'1px solid #d0d5dd',
                    borderRadius:12,
                    cursor:'pointer',
                    textAlign:'left',
                    boxShadow:'0 2px 8px rgba(16,24,40,.04)'
                  }}
                >
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    <span style={{fontSize:18}}>{isCollapsed ? '▶' : '▼'}</span>
                    <span style={{fontSize:20}}>📁</span>
                    <b style={{fontSize:16}}>{folder}</b>
                  </div>
                  <span style={{
                    minWidth:36,
                    height:30,
                    padding:'0 10px',
                    display:'inline-flex',
                    alignItems:'center',
                    justifyContent:'center',
                    borderRadius:16,
                    background:list.length ? '#eaf2ff' : '#f2f4f7',
                    color:list.length ? '#175cd3' : '#667085',
                    fontWeight:800
                  }}>{list.length}</span>
                </button>
                {!isCollapsed && (
                  <div style={{marginTop:8}}>
                    {list.length
                      ? <div className="cards">{list.map(renderCard)}</div>
                      : <div style={{padding:20,textAlign:'center',background:'#f8fafc',borderRadius:10,color:'#667085'}}>В этой папке заявок нет</div>}
                  </div>
                )}
              </div>;
            })}

            {unassignedNewItems.length > 0 && <div style={{marginTop:14}}>
              <div style={{padding:'11px 14px',background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:10,color:'#9a3412',fontWeight:700}}>
                ⚠️ Заявки без папки: {unassignedNewItems.length}
              </div>
              <div style={{marginTop:8}} className="cards">{unassignedNewItems.map(renderCard)}</div>
            </div>}
          </section>;
        }
        if (selectedStatus === 'working') return section('Заявки в работе',workingItems,'Заявок в работе нет');
        if (selectedStatus === 'done') return <section style={{marginTop:20}}>
          <div style={{
            display:'flex',
            alignItems:'center',
            justifyContent:'space-between',
            gap:12,
            marginBottom:12,
            padding:'4px 2px'
          }}>
            <div>
              <h2 style={{margin:0,fontSize:21}}>Выполненные заявки</h2>
              <div style={{fontSize:13,color:'#667085',marginTop:3}}>Показано заявок: {doneItems.length}</div>
            </div>
            <span style={{minWidth:34,height:34,padding:'0 10px',display:'inline-flex',alignItems:'center',justifyContent:'center',borderRadius:18,background:'#f2f4f7',fontWeight:800,color:'#344054'}}>{doneItems.length}</span>
          </div>
          {!doneItems.length ? <div style={{padding:26,textAlign:'center',background:'#f8fafc',borderRadius:12,color:'#667085'}}>Выполненных заявок нет</div> : Object.entries(doneGroups).map(([date,list]) => {
            const isCollapsed = !!collapsedDoneDates[date];
            return <div key={date} style={{marginBottom:12}}>
              <button
                type="button"
                onClick={()=>setCollapsedDoneDates(prev=>({...prev,[date]:!prev[date]}))}
                style={{width:'100%',display:'flex',alignItems:'center',gap:10,margin:'10px 0',padding:'12px 14px',background:'#eef2ff',border:'1px solid #c7d2fe',borderRadius:10,cursor:'pointer',textAlign:'left'}}
              >
                <span style={{fontSize:18}}>{isCollapsed ? '▶' : '▼'}</span>
                <span style={{fontSize:18}}>📅</span>
                <b style={{fontSize:16}}>{date}</b>
                <span style={{fontSize:13,color:'#667085'}}>— {list.length} заявок</span>
              </button>
              {!isCollapsed && <div className="cards">{list.map(renderCard)}</div>}
            </div>;
          })}
        </section>;
        if (selectedStatus === 'archive') return <section style={{marginTop:20}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,marginBottom:12,padding:'4px 2px'}}>
            <div>
              <h2 style={{margin:0,fontSize:21}}>Архив</h2>
              <div style={{fontSize:13,color:'#667085',marginTop:3}}>Заявки, перенесённые в архив</div>
            </div>
            <span style={{minWidth:34,height:34,padding:'0 10px',display:'inline-flex',alignItems:'center',justifyContent:'center',borderRadius:18,background:'#f2f4f7',fontWeight:800,color:'#344054'}}>{archiveItems.length}</span>
          </div>
          {!archiveItems.length
            ? <div style={{padding:26,textAlign:'center',background:'#f8fafc',borderRadius:12,color:'#667085'}}>Архив пуст</div>
            : <div className="cards">{archiveItems.map(x => <div key={x.id}>
                {renderCard(x)}
                {x.status === 'Архив' && <div style={{marginTop:-8,marginBottom:14,padding:'9px 12px',background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:10,color:'#9a3412',fontWeight:700}}>Причина: Отказ от услуг</div>}
              </div>)}</div>}
        </section>;
        return section('Новые заявки',newItems,'Новых заявок нет');
      })()}
    </main>
    {detailItem && <div className="overlay"><div className="modal">
      <div className="modalhead"><h2>Заявка № {detailItem.request_number || detailItem.id}</h2><button onClick={()=>setDetailItem(null)}><X/></button></div>
      <div style={{display:'grid',gap:12}}>
        <div><small>Статус</small><div><b>{detailItem.status || '—'}</b></div></div>
        <div><small>Папка</small><div>{detailItem.folder || '—'}</div></div>
        <div><small>Адрес</small><div>{detailItem.address || '—'}</div></div>
        <div><small>Лицевой счёт</small><div>{detailItem.personal_account || '—'}</div></div>
        <div><small>Абонент</small><div>{detailItem.client_name || '—'}</div></div>
        <div><small>Телефон</small><div style={{display:'grid',gap:6}}>{[detailItem.phone,detailItem.phone2,detailItem.phone3].filter(Boolean).length ? [detailItem.phone,detailItem.phone2,detailItem.phone3].filter(Boolean).map((p,i)=><a key={i} href={`tel:${p.replace(/[^0-9+]/g,'')}`} style={{color:'#2563eb',fontWeight:700,textDecoration:'none'}}>📞 {p}</a>) : '—'}</div></div>
        <div><small>Счётчик</small><div>{detailItem.meter_number || '—'}</div></div>
        <div><small>Модель</small><div>{detailItem.meter_model || '—'}</div></div>
        <div><small>Дата последней поверки</small><div>{detailItem.last_verification_date ? new Date(detailItem.last_verification_date).toLocaleDateString('ru-RU') : '—'}</div></div>
        <div><small>Комментарий руководителя</small><div>{detailItem.comment || '—'}</div></div>
        <div><small>Исполнитель</small><div>{detailItem.taken_by || '—'}</div></div>
        <div><small>История связи</small><div>
          {detailItem.contact_history?.length
            ? detailItem.contact_history.map((h,i)=><div key={i}>{h.status} — {new Date(h.at).toLocaleString('ru-RU')}{h.worker ? ` — ${h.worker}` : ''}</div>)
            : (detailItem.contact_status && detailItem.contact_status_at ? `${detailItem.contact_status} — ${new Date(detailItem.contact_status_at).toLocaleString('ru-RU')}` : '—')}
        </div></div>
        <div><small>Результат проверки</small><div style={{marginTop:4}}>
          {detailItem.verification_status
            ? <span style={{
                display:'inline-flex',
                padding:'7px 12px',
                borderRadius:999,
                fontWeight:800,
                background:detailItem.verification_status==='Годен' ? '#dcfce7' : '#fee2e2',
                color:detailItem.verification_status==='Годен' ? '#15803d' : '#b91c1c'
              }}>{detailItem.verification_status==='Годен' ? '✓ ГОДЕН' : '✕ НЕГОДЕН'}</span>
            : '—'}
        </div></div>
        <div><small>Показания счётчика</small><div>{detailItem.readings || '—'}</div></div>
        <div><small>Комментарий работника</small><div>{detailItem.worker_comment || '—'}</div></div>
        {detailItem.photo_url && <div><small>Фото счётчика</small><div><button type="button" onClick={()=>openPhoto(detailItem.photo_url)}>Открыть фото</button></div></div>}
      </div>
      <div style={{display:'grid',gap:10,marginTop:18}}>
        <button className="primary wide" onClick={()=>{setEditItem({...detailItem});setDetailItem(null);}}>Редактировать заявку</button>
        <button className="wide" style={{background:'#fff0f0',color:'#b42318',border:'1px solid #f5c2c2'}} onClick={()=>deleteRequest(detailItem.id)}>Удалить заявку</button>
      </div>
    </div></div>}
    {editItem && <div className="overlay"><div className="modal">
      <div className="modalhead"><h2>Редактирование заявки № {editItem.request_number || editItem.id}</h2><button onClick={()=>setEditItem(null)}><X/></button></div>
      <input placeholder="Адрес" value={editItem.address || ''} onChange={e=>setEditItem({...editItem,address:e.target.value})}/>
      <input placeholder="Лицевой счёт" value={editItem.personal_account || ''} onChange={e=>setEditItem({...editItem,personal_account:e.target.value})}/>
      <input placeholder="ФИО абонента" value={editItem.client_name || ''} onChange={e=>setEditItem({...editItem,client_name:e.target.value})}/>
      <input placeholder="Телефон" value={editItem.phone || ''} onChange={e=>setEditItem({...editItem,phone:e.target.value})}/>
      <input placeholder="Дополнительный телефон 2" value={editItem.phone2 || ''} onChange={e=>setEditItem({...editItem,phone2:e.target.value})}/>
      <input placeholder="Дополнительный телефон 3" value={editItem.phone3 || ''} onChange={e=>setEditItem({...editItem,phone3:e.target.value})}/>
      <input placeholder="Номер счётчика" value={editItem.meter_number || ''} onChange={e=>setEditItem({...editItem,meter_number:e.target.value})}/>
      <input placeholder="Модель счётчика" value={editItem.meter_model || ''} onChange={e=>setEditItem({...editItem,meter_model:e.target.value})}/>
      <label style={{display:'block',marginBottom:6,fontWeight:600}}>Дата последней поверки</label>
      <input type="date" value={editItem.last_verification_date || ''} onChange={e=>setEditItem({...editItem,last_verification_date:e.target.value})}/>
      <textarea placeholder="Комментарий" value={editItem.comment || ''} onChange={e=>setEditItem({...editItem,comment:e.target.value})}/>
      <button className="primary wide" onClick={updateRequest} disabled={editBusy}>{editBusy ? 'Сохранение...' : 'Сохранить изменения'}</button>
    </div></div>}
    {contactId && <div className="overlay"><div className="modal">
      <div className="modalhead"><h2>Связь с абонентом</h2><button onClick={()=>setContactId(null)} disabled={contactBusy}><X/></button></div>
      <p style={{marginTop:0,color:'#667085'}}>Укажите причину, по которой проверку не удалось провести сейчас. Заявка вернётся в очередь «Новая».</p>
      <div style={{display:'grid',gap:10}}>
        <button type="button" className="wide" disabled={contactBusy} onClick={()=>markContactStatus(contactId,'Нет дома')}>🏠 НЕТ ДОМА</button>
        <button type="button" className="wide" disabled={contactBusy} onClick={()=>markContactStatus(contactId,'Телефон отключен')}>📵 ТЕЛЕФОН ОТКЛЮЧЕН</button>
        <button type="button" className="wide" disabled={contactBusy} onClick={()=>markContactStatus(contactId,'Не поднял телефон')}>📞 НЕ ПОДНЯЛ ТЕЛЕФОН</button>
        <button type="button" className="wide" disabled={contactBusy} onClick={()=>setContactId(null)}>Отмена</button>
      </div>
    </div></div>}
    {completeId && <div className="overlay"><div className="modal">
      <div className="modalhead"><h2>Завершение проверки</h2><button onClick={()=>setCompleteId(null)}><X/></button></div>
      <div style={{marginBottom:14}}>
        <label style={{display:'block',marginBottom:8,fontWeight:700}}>Результат проверки *</label>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          <button
            type="button"
            onClick={()=>setCompleteForm({...completeForm,verification_status:'Годен'})}
            style={{
              padding:'14px 12px',
              borderRadius:12,
              border:'2px solid '+(completeForm.verification_status==='Годен' ? '#22c55e' : '#d0d5dd'),
              background:completeForm.verification_status==='Годен' ? '#dcfce7' : '#fff',
              color:completeForm.verification_status==='Годен' ? '#15803d' : '#344054',
              fontWeight:800,
              cursor:'pointer'
            }}
          >✓ ГОДЕН</button>
          <button
            type="button"
            onClick={()=>setCompleteForm({...completeForm,verification_status:'Негоден'})}
            style={{
              padding:'14px 12px',
              borderRadius:12,
              border:'2px solid '+(completeForm.verification_status==='Негоден' ? '#ef4444' : '#d0d5dd'),
              background:completeForm.verification_status==='Негоден' ? '#fee2e2' : '#fff',
              color:completeForm.verification_status==='Негоден' ? '#b91c1c' : '#344054',
              fontWeight:800,
              cursor:'pointer'
            }}
          >✕ НЕГОДЕН</button>
        </div>
      </div>
      <textarea placeholder="Описание результата проверки *" value={completeForm.result} onChange={e=>setCompleteForm({...completeForm,result:e.target.value})}/>
      <input placeholder="Показания счётчика" value={completeForm.readings} onChange={e=>setCompleteForm({...completeForm,readings:e.target.value})}/>
      <textarea placeholder="Комментарий работника" value={completeForm.worker_comment} onChange={e=>setCompleteForm({...completeForm,worker_comment:e.target.value})}/>
      <label style={{display:'block',marginBottom:6,fontWeight:600}}>Фото счётчика</label>
      <input type="file" accept="image/*" onChange={e=>setCompleteForm({...completeForm,photo:e.target.files?.[0] || null})}/>
      {completeForm.photo && <div style={{margin:'8px 0',fontSize:13}}>Выбрано: {completeForm.photo.name}</div>}
      <button className="success wide" onClick={()=>completeRequest(completeId)}>Сохранить и завершить</button>
    </div></div>}
    {showEmployees && <div className="overlay"><div className="modal" style={{maxWidth:760}}>
      <div className="modalhead"><h2>👥 Сотрудники</h2><button onClick={()=>setShowEmployees(false)}><X/></button></div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:18}}>
        <div><label style={{display:'block',marginBottom:6,fontWeight:600}}>ФИО *</label><input value={employeeForm.full_name} onChange={e=>setEmployeeForm({...employeeForm,full_name:e.target.value})} placeholder="Иванов Иван Иванович" /></div>
        <div><label style={{display:'block',marginBottom:6,fontWeight:600}}>Телефон</label><input value={employeeForm.phone} onChange={e=>setEmployeeForm({...employeeForm,phone:e.target.value})} placeholder="+7..." /></div>
        <div><label style={{display:'block',marginBottom:6,fontWeight:600}}>Роль</label><select value={employeeForm.role} onChange={e=>setEmployeeForm({...employeeForm,role:e.target.value})}><option value="worker">Работник</option><option value="manager">Руководитель</option></select></div>
        <div><label style={{display:'block',marginBottom:6,fontWeight:600}}>Логин (email) *</label><input type="email" value={employeeForm.email} onChange={e=>setEmployeeForm({...employeeForm,email:e.target.value})} placeholder="employee@example.com" /></div>
      </div>
      <button className="primary wide" onClick={addEmployee} disabled={employeeBusy}>{employeeBusy ? 'Сохранение...' : 'Добавить сотрудника'}</button>
      <div style={{marginTop:22}}><h3 style={{marginBottom:10}}>Зарегистрированные пользователи</h3>{employees.length===0 ? <div style={{padding:16,background:'#f8fafc',borderRadius:10}}>Зарегистрированных пользователей пока нет.</div> : employees.map(e=><div key={e.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,padding:'12px 0',borderBottom:'1px solid #eaecf0'}}><div><b>{e.full_name || 'Без ФИО'}</b><div style={{fontSize:13,color:'#667085'}}>{e.phone || 'Телефон не указан'} · {e.role==='manager' ? 'Руководитель' : 'Работник'}</div></div><button type="button" onClick={()=>setEditingEmployee({id:e.id,full_name:e.full_name||'',phone:e.phone||'',role:e.role||'worker'})}>✏️ Управлять</button></div>)}</div>
    </div></div>}
    {editingEmployee && <div className="overlay"><div className="modal" style={{maxWidth:520}}>
      <div className="modalhead"><h2>Управление сотрудником</h2><button onClick={()=>setEditingEmployee(null)} disabled={employeeBusy}><X/></button></div>
      <label style={{display:'block',marginBottom:6,fontWeight:600}}>ФИО</label>
      <input value={editingEmployee.full_name} onChange={e=>setEditingEmployee({...editingEmployee,full_name:e.target.value})}/>
      <label style={{display:'block',marginBottom:6,fontWeight:600}}>Телефон</label>
      <input value={editingEmployee.phone} onChange={e=>setEditingEmployee({...editingEmployee,phone:e.target.value})}/>
      <label style={{display:'block',marginBottom:6,fontWeight:600}}>Роль</label>
      <select value={editingEmployee.role} onChange={e=>setEditingEmployee({...editingEmployee,role:e.target.value})}>
        <option value="worker">Работник</option>
        <option value="manager">Руководитель</option>
      </select>
      <button className="primary wide" onClick={saveEmployee} disabled={employeeBusy}>{employeeBusy ? 'Сохранение...' : 'Сохранить'}</button>
      <button className="wide" style={{marginTop:8}} onClick={()=>setEditingEmployee(null)} disabled={employeeBusy}>Отмена</button>
    </div></div>}
    {showReport && <div className="overlay"><div className="modal">
      <div className="modalhead"><h2>📊 Отчет по датам</h2><button onClick={()=>setShowReport(false)}><X/></button></div>
      <p style={{marginTop:0,color:'#667085'}}>Выберите период и выгрузите заявки в Excel.</p>
      <label style={{display:'block',marginBottom:6,fontWeight:600}}>Считать дату по</label>
      <select value={reportDateType} onChange={e=>setReportDateType(e.target.value)} style={{width:'100%',marginBottom:12}}>
        <option value="completed">Дате выполнения</option>
        <option value="created">Дате создания заявки</option>
      </select>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
        <div><label style={{display:'block',marginBottom:6,fontWeight:600}}>С даты</label><input type="date" value={reportFrom} onChange={e=>setReportFrom(e.target.value)}/></div>
        <div><label style={{display:'block',marginBottom:6,fontWeight:600}}>По дату</label><input type="date" value={reportTo} onChange={e=>setReportTo(e.target.value)}/></div>
      </div>
      <div style={{margin:'14px 0',padding:12,background:'#f8fafc',borderRadius:10}}>Найдено заявок: <b>{getReportItems().length}</b></div>
      <button className="success wide" onClick={exportReport}>📥 Скачать Excel</button>
      <button className="wide" style={{marginTop:8}} onClick={()=>{setReportFrom('');setReportTo('');}}>Сбросить даты</button>
    </div></div>}
    {show && <div className="overlay"><div className="modal"><div className="modalhead"><h2>Новая заявка</h2><button onClick={()=>setShow(false)}><X/></button></div>
      <input placeholder="Адрес" value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/>
      <input placeholder="Лицевой счёт" value={form.personal_account} onChange={e=>setForm({...form,personal_account:e.target.value})}/>
      <input placeholder="ФИО абонента" value={form.client} onChange={e=>setForm({...form,client:e.target.value})}/>
      <input placeholder="Телефон" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/>
      <input placeholder="Дополнительный телефон 2" value={form.phone2} onChange={e=>setForm({...form,phone2:e.target.value})}/>
      <input placeholder="Дополнительный телефон 3" value={form.phone3} onChange={e=>setForm({...form,phone3:e.target.value})}/>
      <input placeholder="Номер счётчика" value={form.meter} onChange={e=>setForm({...form,meter:e.target.value})}/>
      <input placeholder="Модель счётчика" value={form.model} onChange={e=>setForm({...form,model:e.target.value})}/>
      <label style={{display:'block',marginBottom:6,fontWeight:600}}>Папка *</label>
      <select value={form.folder} onChange={e=>setForm({...form,folder:e.target.value})}>
        {newFolders.map(folder => <option key={folder} value={folder}>{folder}</option>)}
      </select>
      <label style={{display:'block',marginBottom:6,fontWeight:600}}>Дата последней поверки</label>
      <input type="date" value={form.last_verification_date} onChange={e=>setForm({...form,last_verification_date:e.target.value})}/>
      <textarea placeholder="Комментарий" value={form.comment} onChange={e=>setForm({...form,comment:e.target.value})}/>
      <button className="primary wide" onClick={createRequest}>Создать заявку</button>
    </div></div>}
  </div>;
}

createRoot(document.getElementById('root')).render(<App />);
