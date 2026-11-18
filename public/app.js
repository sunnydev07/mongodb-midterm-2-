const isHttp = window.location.protocol.startsWith('http');

// Tab switching
document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach((p) => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`panel-${tab.dataset.tab}`).classList.add('active');
  });
});

async function apiFetch(url, options = {}) {
  if (!isHttp) {
    throw new Error('Server not running; start with `npm start` for fullstack API.');
  }
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

function setModePills(studentsMode, bankingMode) {
  const sPill = document.getElementById('students-mode-pill');
  const bPill = document.getElementById('banking-mode-pill');

  sPill.textContent = `A2: ${studentsMode === 'live' ? 'LIVE MONGODB' : 'SIMULATION'}`;
  sPill.className = `pill ${studentsMode === 'live' ? 'pill-live' : 'pill-sim'}`;

  bPill.textContent = `A4: ${bankingMode === 'live' ? 'LIVE REPLICA SET' : 'SIMULATION'}`;
  bPill.className = `pill ${bankingMode === 'live' ? 'pill-live' : 'pill-sim'}`;
}

async function refreshHealth() {
  try {
    const { data } = await apiFetch('/api/health');
    setModePills(data.studentsMode, data.bankingMode);
  } catch {
    setModePills('simulation', 'simulation');
  }
}

/* ==================== SCENARIO A2 ==================== */

async function loadStudentsTable() {
  try {
    const { data } = await apiFetch('/api/students');
    const tbody = document.getElementById('a2-table-body');
    const countBadge = document.getElementById('a2-count');
    countBadge.textContent = `${data.count} document${data.count === 1 ? '' : 's'}`;

    if (!data.data.length) {
      tbody.innerHTML =
        '<tr><td colspan="6" class="empty-cell">Collection is empty. Run Task 1 and Task 3 to populate.</td></tr>';
      return;
    }

    tbody.innerHTML = data.data
      .map((s) => {
        const dbms = s.scores?.find((x) => x.subject === 'DBMS')?.mark ?? '-';
        const maths = s.scores?.find((x) => x.subject === 'Maths')?.mark ?? '-';
        return `
          <tr>
            <td>${s._id}</td>
            <td>${s.name}</td>
            <td>${s.dept}</td>
            <td>${s.marks}</td>
            <td>${dbms}</td>
            <td>${maths}</td>
          </tr>`;
      })
      .join('');
  } catch (err) {
    console.error(err);
  }
}

async function runA2Task(taskNum) {
  const isPost = [1, 2, 3].includes(Number(taskNum));
  const { data } = await apiFetch(`/api/students/task${taskNum}`, {
    method: isPost ? 'POST' : 'GET'
  });

  document.getElementById('a2-query-box').textContent = data.query || '';
  const noteBox = document.getElementById('a2-note-box');

  if (data.explanation) {
    noteBox.textContent = data.explanation;
    noteBox.classList.remove('hidden');
  } else if (data.comparisonNote) {
    noteBox.textContent = `Without $elemMatch (${data.comparisonNote.wrongQuery}): returns ${data.comparisonNote.wrongCount} docs [${data.comparisonNote.wrongNames.join(', ')}]. ${data.comparisonNote.reason}`;
    noteBox.classList.remove('hidden');
  } else {
    noteBox.classList.add('hidden');
  }

  document.getElementById('a2-output').textContent = JSON.stringify(
    data.output ?? data.error ?? data,
    null,
    2
  );
  await loadStudentsTable();
}

document.querySelectorAll('[data-a2-task]').forEach((btn) => {
  btn.addEventListener('click', () => runA2Task(btn.dataset.a2Task));
});

document.getElementById('a2-reset').addEventListener('click', async () => {
  const { data } = await apiFetch('/api/students/reset', { method: 'POST' });
  document.getElementById('a2-query-box').textContent = 'db.students.deleteMany({})';
  document.getElementById('a2-note-box').classList.add('hidden');
  document.getElementById('a2-output').textContent = JSON.stringify(data, null, 2);
  await loadStudentsTable();
});

document.getElementById('a2-run-all').addEventListener('click', async () => {
  await apiFetch('/api/students/reset', { method: 'POST' });
  const summary = [];
  for (let i = 1; i <= 8; i++) {
    const isPost = i <= 3;
    const { data } = await apiFetch(`/api/students/task${i}`, {
      method: isPost ? 'POST' : 'GET'
    });
    summary.push({ task: i, query: data.query, output: data.output ?? data.error });
  }
  document.getElementById('a2-query-box').textContent = 'Executed Tasks 1 through 8 sequentially';
  document.getElementById('a2-note-box').classList.add('hidden');
  document.getElementById('a2-output').textContent = JSON.stringify(summary, null, 2);
  await loadStudentsTable();
});

document.getElementById('custom-student-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    _id: Number(document.getElementById('stu-id').value),
    name: document.getElementById('stu-name').value,
    dept: document.getElementById('stu-dept').value,
    marks: Number(document.getElementById('stu-marks').value),
    dbms: Number(document.getElementById('stu-dbms').value),
    maths: Number(document.getElementById('stu-maths').value)
  };
  const { data } = await apiFetch('/api/students/custom', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  document.getElementById('a2-query-box').textContent = `db.students.insertOne(${JSON.stringify(payload)})`;
  document.getElementById('a2-note-box').classList.add('hidden');
  document.getElementById('a2-output').textContent = JSON.stringify(data, null, 2);
  e.target.reset();
  await loadStudentsTable();
});

/* ==================== SCENARIO A4 ==================== */

async function loadBankingState() {
  try {
    const { data } = await apiFetch('/api/banking/state');
    const nodesGrid = document.getElementById('a4-nodes-grid');
    nodesGrid.innerHTML = (data.members || [])
      .map((m) => {
        const isPrimary = m.state === 'PRIMARY';
        return `
          <div class="node-card ${isPrimary ? 'primary' : ''}">
            <div>
              <strong>${m.name}</strong>
              <div class="muted">health: ${m.health}</div>
            </div>
            <span class="node-role ${isPrimary ? 'role-primary' : 'role-secondary'}">${m.state}</span>
          </div>`;
      })
      .join('');

    const tbody = document.getElementById('a4-table-body');
    const countBadge = document.getElementById('a4-count');
    const accounts = data.accounts || [];
    countBadge.textContent = `${accounts.length} account${accounts.length === 1 ? '' : 's'}`;

    if (!accounts.length) {
      tbody.innerHTML =
        '<tr><td colspan="4" class="empty-cell">No accounts yet. Run Task 3 to insert Kumar (accNo: 1001, balance: 5000).</td></tr>';
    } else {
      tbody.innerHTML = accounts
        .map(
          (a) => `
          <tr>
            <td><code>${a._id}</code></td>
            <td>${a.accNo}</td>
            <td>${a.holder}</td>
            <td>${a.balance}</td>
          </tr>`
        )
        .join('');
    }
  } catch (err) {
    console.error(err);
  }
}

async function runA4Task(taskNum) {
  const isPost = [1, 3, 6].includes(Number(taskNum));
  const { data } = await apiFetch(`/api/banking/task${taskNum}`, {
    method: isPost ? 'POST' : 'GET',
    body: taskNum === '3' ? JSON.stringify({ accNo: 1001, holder: 'Kumar', balance: 5000 }) : undefined
  });

  document.getElementById('a4-query-box').textContent = data.query || '';
  const noteBox = document.getElementById('a4-note-box');
  const noteText = data.whyReplication || data.note || data.event || (data.servedBy ? `Read served by: ${data.servedBy}` : '');
  if (noteText) {
    noteBox.textContent = noteText;
    noteBox.classList.remove('hidden');
  } else {
    noteBox.classList.add('hidden');
  }

  const readPrefWrap = document.getElementById('a4-readpref-wrap');
  if (data.readPreferences) {
    document.getElementById('a4-readpref-body').innerHTML = data.readPreferences
      .map((r) => `<tr><td><code>${r.mode}</code></td><td>${r.meaning}</td></tr>`)
      .join('');
    readPrefWrap.classList.remove('hidden');
  } else {
    readPrefWrap.classList.add('hidden');
  }

  document.getElementById('a4-output').textContent = JSON.stringify(data.output ?? data, null, 2);
  await loadBankingState();
}

document.querySelectorAll('[data-a4-task]').forEach((btn) => {
  btn.addEventListener('click', () => runA4Task(btn.dataset.a4Task));
});

document.getElementById('a4-refresh').addEventListener('click', loadBankingState);

document.getElementById('custom-account-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    accNo: Number(document.getElementById('acc-no').value),
    holder: document.getElementById('acc-holder').value,
    balance: Number(document.getElementById('acc-balance').value)
  };
  const { data } = await apiFetch('/api/banking/task3', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  document.getElementById('a4-query-box').textContent = data.query;
  document.getElementById('a4-note-box').textContent = data.note || '';
  document.getElementById('a4-note-box').classList.toggle('hidden', !data.note);
  document.getElementById('a4-readpref-wrap').classList.add('hidden');
  document.getElementById('a4-output').textContent = JSON.stringify(data.output, null, 2);
  e.target.reset();
  await loadBankingState();
});

// Initial load
refreshHealth();
loadStudentsTable();
loadBankingState();
