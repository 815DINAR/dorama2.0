/*  Обработчики ---------------------------------------------------------------- */
const fileInput = document.getElementById('jsonFile');
const summaryEl = document.getElementById('summary');
const chartWrapper = document.querySelector('.chart-wrapper');
const ctx = document.getElementById('sessionsChart');

let sessionsChart; // ссылка на диаграмму Chart.js

fileInput.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  try {
    const jsonText = await file.text();
    const rawData = JSON.parse(jsonText);

    const { labels, hoursArr, timesHMS, summaryHtml } = analyseData(rawData);

    renderSummary(summaryHtml);
    renderChart(labels, hoursArr, timesHMS);

  } catch (err) {
    alert('Не удалось обработать файл: ' + err.message);
    console.error(err);
  }
});

/*  Анализ данных -------------------------------------------------------------- */
function analyseData(data) {
  const labels = [];
  const hoursArr = [];  // суммарное время в часах (для высоты столбца)
  const timesHMS = [];  // то же в формате ЧЧ:ММ:СС
  let summaryHtml = '<h2>Сводка</h2><ul>';

  Object.values(data).forEach((user) => {
    const name = user.username || user.first_name || user.user_id;

    const totalSeconds = user.sessions.reduce(
      (acc, s) => acc + (Number(s.duration_seconds) || 0),
      0
    );
    const hours = +(totalSeconds / 3600).toFixed(2);
    const hms  = formatSecondsToHMS(totalSeconds);

    const likesCount      = (user.likes      || []).length;
    const dislikesCount   = (user.dislikes   || []).length;
    const favoritesCount  = (user.favorites  || []).length;

    labels.push(name);
    hoursArr.push(hours);
    timesHMS.push(hms);

    summaryHtml += `<li><strong>${name}</strong> — 
        сессий: ${user.sessions.length}, 
        время: ${hms},
        👍 ${likesCount},
        👎 ${dislikesCount},
        ⭐ ${favoritesCount}
      </li>`;
  });

  summaryHtml += '</ul>';
  return { labels, hoursArr, timesHMS, summaryHtml };
}

/*  Форматирование времени ----------------------------------------------------- */
function formatSecondsToHMS(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;

  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

/*  Вывод сводки --------------------------------------------------------------- */
function renderSummary(html) {
  summaryEl.innerHTML = html;
  summaryEl.classList.remove('hidden');
}

/*  Построение диаграммы ------------------------------------------------------- */
function renderChart(labels, hoursArr, timesHMS) {
  chartWrapper.classList.remove('hidden');

  // если график уже есть — уничтожаем и создаём заново
  if (sessionsChart) sessionsChart.destroy();

  sessionsChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Время в приложении (часы)',
          data: hoursArr,
          borderWidth: 1,
        },
      ],
    },
    options: {
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (tooltipItem) =>
              `${timesHMS[tooltipItem.dataIndex]} (${tooltipItem.formattedValue} ч.)`
          }
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: 'Часы' },
        },
      },
    },
  });
}
