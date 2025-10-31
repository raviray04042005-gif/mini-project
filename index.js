// script.js
// ETM — Employee Task Manager (charts + persistent data + edit/delete)

// --- state
let employees = [];
let employeeChart = null;
let contributionChart = null;
let editIndex = -1;

// --- remark logic (improved)
function generateRemark(contribution, taskCompleted) {
  if (taskCompleted >= 95 && contribution >= 90) return "🌟 Exceptional — top performer!";
  if (taskCompleted >= 90 && contribution >= 80) return "🌟 Outstanding performance!";
  if (taskCompleted >= 75 && contribution >= 60) return "👍 Great job!";
  if (taskCompleted >= 60) return "🙂 Good — room to grow.";
  if (taskCompleted >= 40) return "⚠️ Needs improvement.";
  return "❌ Below expectations.";
}

// --- storage helpers
const STORAGE_KEY = 'etm_employees_v1';
function saveEmployees() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(employees));
}
function loadEmployees() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    employees = raw ? JSON.parse(raw) : [];
  } catch (e) {
    employees = [];
  }
}

// --- DOM helpers
function $(id){ return document.getElementById(id); }
function escapeHTML(s){ return String(s).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }

// --- form read/clear
function readForm() {
  const empId = $('empId').value.trim();
  const position = $('position').value.trim();
  const name = $('name').value.trim();
  const contribution = parseInt($('contribution').value, 10);
  const activities = $('activities').value.trim();
  const taskCompleted = parseInt($('taskCompleted').value, 10);

  if (!empId || !position || !name || isNaN(contribution) || !activities || isNaN(taskCompleted)) {
    alert('Please fill all fields correctly. Contribution & Task Completed must be numeric (0-100).');
    return null;
  }
  if (contribution < 0 || contribution > 100 || taskCompleted < 0 || taskCompleted > 100) {
    alert('Contribution and Task Completed must be between 0 and 100.');
    return null;
  }

  const remarks = generateRemark(contribution, taskCompleted);
  $('remarks').value = remarks;

  return { empId, position, name, contribution, activities, taskCompleted, remarks };
}

function clearForm() {
  $('employeeForm').reset();
  $('remarks').value = '';
  editIndex = -1;
  $('submitBtn').textContent = 'Add Employee';
}

// --- CRUD actions
function addEmployeeFromForm() {
  const emp = readForm();
  if (!emp) return;
  employees.push(emp);
  saveEmployees();
  renderEmployees();
  updateCharts();
  clearForm();
}

function editEmployee(index) {
  const e = employees[index];
  $('empId').value = e.empId;
  $('position').value = e.position;
  $('name').value = e.name;
  $('contribution').value = e.contribution;
  $('activities').value = e.activities;
  $('taskCompleted').value = e.taskCompleted;
  $('remarks').value = e.remarks;
  editIndex = index;
  $('submitBtn').textContent = 'Save Changes';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function saveEditFromForm() {
  const emp = readForm();
  if (!emp) return;
  employees[editIndex] = emp;
  saveEmployees();
  renderEmployees();
  updateCharts();
  clearForm();
}

function deleteEmployee(index) {
  if (!confirm('Delete this employee?')) return;
  employees.splice(index, 1);
  saveEmployees();
  renderEmployees();
  updateCharts();
}

// --- render list
function renderEmployees() {
  const list = $('employeeList');
  if (!employees.length) {
    list.innerHTML = `<div style="padding:14px;color:rgba(255,255,255,0.85)">No employees yet. Use the form above to add one.</div>`;
    return;
  }

  list.innerHTML = employees.map((emp, i) => `
    <div class="employee-card">
      <div class="card-left">
        <strong>${escapeHTML(emp.name)}</strong> <span class="muted">(${escapeHTML(emp.position)})</span>
        <div class="muted">ID: ${escapeHTML(emp.empId)} • Task: ${emp.taskCompleted}% • Contribution: ${emp.contribution}%</div>
        <div class="activities">${escapeHTML(emp.activities)}</div>
        <div class="remarks">${escapeHTML(emp.remarks)}</div>
      </div>
      <div class="card-actions">
        <button class="btn edit" onclick="editEmployee(${i})">Edit</button>
        <button class="btn delete" onclick="deleteEmployee(${i})">Delete</button>
      </div>
    </div>
  `).join('');
}

// --- Chart initialization (create once)
function initCharts() {
  const ctxTasks = $('employeeChart').getContext('2d');
  const ctxContrib = $('contributionChart').getContext('2d');

  employeeChart = new Chart(ctxTasks, {
    type: 'bar',
    data: { labels: [], datasets: [{ label: 'Task Completion (%)', data: [], backgroundColor: [], borderColor: [], borderWidth: 1 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { mode: 'index', intersect: false }
      },
      scales: { y: { beginAtZero: true, max: 100, ticks: { stepSize: 10 } } },
      animation: { duration: 600 }
    }
  });

  contributionChart = new Chart(ctxContrib, {
    type: 'doughnut',
    data: { labels: [], datasets: [{ label: 'Contribution (%)', data: [], backgroundColor: [], hoverOffset: 6 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.label}: ${ctx.raw}%`
          }
        },
        legend: { position: 'bottom' }
      },
      animation: { duration: 700 }
    }
  });
}

// --- Chart update (no duplicates)
function updateCharts() {
  const labels = employees.map(e => e.name);
  const taskData = employees.map(e => e.taskCompleted);
  const contribData = employees.map(e => e.contribution);
  const colors = generateColorPalette(employees.length);

  // Update bar chart
  employeeChart.data.labels = labels;
  employeeChart.data.datasets[0].data = taskData;
  employeeChart.data.datasets[0].backgroundColor = colors;
  employeeChart.data.datasets[0].borderColor = colors.map(c => shadeHex(c, -16));
  employeeChart.update();

  // Update doughnut chart
  contributionChart.data.labels = labels;
  contributionChart.data.datasets[0].data = contribData;
  contributionChart.data.datasets[0].backgroundColor = colors;
  contributionChart.update();
}

// --- nice color helpers
function generateColorPalette(n){
  const arr = [];
  for(let i=0;i<n;i++){
    const hue = Math.round((i * 360 / Math.max(n, 6)) % 360);
    arr.push(`hsl(${hue}, 85%, 55%)`);
  }
  return arr;
}
function shadeHex(hslStr, lightnessChange){
  // hsl(...) -> return rgb-ish string as border; small tweak to lightness
  const m = hslStr.match(/hsl\((\d+),\s*(\d+)%\s*,\s*(\d+)%\)/);
  if(!m) return hslStr;
  const h = +m[1], s = +m[2], l = Math.max(0, Math.min(100, +m[3] + lightnessChange));
  return `hsl(${h}, ${s}%, ${l}%)`;
}

// --- init + event wiring
window.addEventListener('DOMContentLoaded', () => {
  loadEmployees();
  initCharts();
  renderEmployees();
  updateCharts();

  // form submit
  $('employeeForm').addEventListener('submit', ev => {
    ev.preventDefault();
    if (editIndex === -1) addEmployeeFromForm();
    else saveEditFromForm();
  });

  $('clearBtn').addEventListener('click', clearForm);
});
