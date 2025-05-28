// script2.js radar chart y gráfico de velas

const metrics = [
  { label: "Market Cap", key: "Fundamentals_Market Cap_2025_4", unit: "$" },
  { label: "Beta", key: "Fundamentals_Beta_2025_4", unit: "" },
  {
    label: "Dividend Rate",
    key: "Fundamentals_dividendRate_2025_4",
    unit: "$",
  },
  {
    label: "Operating Margins",
    key: "Fundamentals_operatingMargins_2025_4",
    unit: "%",
  },
  {
    label: "Debt to Equity",
    key: "Fundamentals_debtToEquity_2025_4",
    unit: "",
  },
];

const defaultMax = {
  "Market Cap": 2.4e12,
  Beta: 10,
  "Dividend Rate": 10,
  "Operating Margins": 100,
  "Debt to Equity": 100,
};

let dataMap = {};
let priceData = [];

const candleColors = [
  ["green", "red"],
  ["orange", "lightblue"],
  ["purple", "pink"],
  ["teal", "brown"],
];

let focusedTickerPrice = null;
let focusedTicker = null;

d3.csv("data4.csv").then((data) => {
  const used = new Set();
  priceData = [];

  data.forEach((d) => {
    const ticker = d.Ticker.trim();
    const date = new Date(d.stockprice_Date);

    if (
      d.stockprice_Open &&
      d.stockprice_Close &&
      d.stockprice_High &&
      d.stockprice_Low
    ) {
      priceData.push({
        ticker,
        date,
        open: +d.stockprice_Open,
        high: +d.stockprice_High,
        low: +d.stockprice_Low,
        close: +d.stockprice_Close,
      });
    }

    if (!used.has(ticker)) {
      used.add(ticker);
      const obj = { company: d["Company Name"].trim() };
      metrics.forEach((m) => (obj[m.label] = +d[m.key]));
      dataMap[ticker] = obj;
    }
  });

  const tickers = Object.keys(dataMap).sort();
  for (let i = 1; i <= 4; i++) {
    ["ticker", "priceTicker"].forEach((prefix) => {
      const sel = d3.select(`#${prefix}${i}`);
      sel.append("option").attr("value", "").text("Ninguno");
      tickers.forEach((t) =>
        sel
          .append("option")
          .attr("value", t)
          .text(`${t} - ${dataMap[t].company}`)
      );
    });
  }

  d3.select("#updateChart").on("click", drawRadarChart);
  d3.select("#updatePriceChart").on("click", drawPriceChart);
});

function drawRadarChart() {
  const selected = [1, 2, 3, 4]
    .map((i) => document.getElementById(`ticker${i}`).value)
    .filter((t) => t !== "");

  if (selected.length === 0) return;

  const chart = d3.select("#radarChart");
  chart.select("svg").remove();
  chart.select(".legend")?.remove();

  const tooltip = chart.select(".tooltip");

  const width = 700,
    height = 700,
    radius = 250,
    levels = 5;
  const angleSlice = (2 * Math.PI) / metrics.length;

  const svg = chart.append("svg").attr("width", width).attr("height", height);

  const g = svg
    .append("g")
    .attr("transform", `translate(${width / 2}, ${height / 2})`);

  const pointsGroup = g.append("g").attr("class", "points-layer");

  const scales = {};
  metrics.forEach((m) => {
    let max;
    if (selected.length === 1) {
      max = defaultMax[m.label];
    } else {
      const vals = selected.map((t) => Math.abs(dataMap[t][m.label]));
      max = d3.max(vals);
    }
    scales[m.label] = d3.scaleLinear().domain([0, max]).range([0, radius]);
  });

  // Círculos concéntricos
  for (let l = 1; l <= levels; l++) {
    const r = (radius / levels) * l;
    g.append("circle").attr("r", r).attr("fill", "none").attr("stroke", "#ddd");
  }

  // Ejes radiales y etiquetas
  metrics.forEach((m, i) => {
    const angle = i * angleSlice - Math.PI / 2;
    const [x, y] = [Math.cos(angle) * radius, Math.sin(angle) * radius];

    g.append("line")
      .attr("x1", 0)
      .attr("y1", 0)
      .attr("x2", x)
      .attr("y2", y)
      .attr("stroke", "#ccc");

    g.append("text")
      .attr("x", Math.cos(angle) * (radius + 20))
      .attr("y", Math.sin(angle) * (radius + 20))
      .attr("text-anchor", "middle")
      .attr("class", "axisLabel")
      .text(`${m.label} ${m.unit}`);
  });

  const color = d3.scaleOrdinal(d3.schemeCategory10);
  let focusedTicker = null;

  const areas = {};
  const circles = {};

  selected.forEach((ticker) => {
    const obj = dataMap[ticker];

    const points = metrics.map((m, i) => {
      const raw = obj[m.label];
      const scaled = scales[m.label](Math.abs(raw));
      const angle = i * angleSlice - Math.PI / 2;
      const sign = raw >= 0 ? 1 : -1;

      return {
        x: Math.cos(angle) * scaled * sign,
        y: Math.sin(angle) * scaled * sign,
        raw,
        label: m.label,
        unit: m.unit,
        ticker,
        company: obj.company,
      };
    });

    // Área
    areas[ticker] = g
      .append("path")
      .datum(points)
      .attr("fill", color(ticker))
      .attr("fill-opacity", 0.3)
      .attr("stroke", color(ticker))
      .attr("stroke-width", 2)
      .attr("class", "area-path")
      .attr(
        "d",
        d3
          .line()
          .x((d) => d.x)
          .y((d) => d.y)
          .curve(d3.curveLinearClosed)
      )
      .on("mousemove", (e, d) => {
        if (!focusedTicker || focusedTicker === ticker) {
          tooltip
            .html(
              `<strong>${ticker} - ${obj.company}</strong><br>Pasar por puntos para ver detalle`
            )
            .style("left", e.offsetX + 10 + "px")
            .style("top", e.offsetY + "px")
            .style("visibility", "visible");
        }
      })
      .on("mouseout", () => tooltip.style("visibility", "hidden"));

    // Puntos (encima de todo)
    circles[ticker] = pointsGroup
      .selectAll(".pt-" + ticker)
      .data(points)
      .enter()
      .append("circle")
      .attr("cx", (d) => d.x)
      .attr("cy", (d) => d.y)
      .attr("r", 4)
      .attr("fill", color(ticker))
      .style("pointer-events", "all")
      .on("mouseover", (e, d) => {
        if (!focusedTicker || focusedTicker === d.ticker) {
          tooltip
            .html(
              `<strong>${d.ticker} - ${d.company}</strong><br>${
                d.label
              }: ${d.raw.toFixed(2)} ${d.unit}`
            )
            .style("left", e.offsetX + 10 + "px")
            .style("top", e.offsetY + "px")
            .style("visibility", "visible");
        }
      })
      .on("mouseout", () => tooltip.style("visibility", "hidden"));
  });

  pointsGroup.raise(); // Asegurar puntos sobre áreas

  // Leyenda interactiva
  const legend = chart.append("div").attr("class", "legend");
  selected.forEach((t) => {
    legend
      .append("div")
      .attr("class", "legend-item")
      .style("cursor", "pointer")
      .html(
        `<div class="legend-color" style="background:${color(t)}"></div>${t}`
      )
      .on("click", () => {
        if (focusedTicker === t) {
          focusedTicker = null;
          Object.keys(areas).forEach((tk) => {
            areas[tk].attr("stroke-width", 2).attr("fill-opacity", 0.3);
            circles[tk].attr("r", 4);
          });
        } else {
          focusedTicker = t;
          Object.keys(areas).forEach((tk) => {
            areas[tk]
              .attr("stroke-width", tk === t ? 3 : 1)
              .attr("fill-opacity", tk === t ? 0.5 : 0.1);
            circles[tk].attr("r", tk === t ? 5 : 2);
          });
        }
      });
  });
}
function drawPriceChart() {
  const selected = [1, 2, 3, 4]
    .map((i) => document.getElementById(`priceTicker${i}`).value)
    .filter((t) => t !== "");
  if (selected.length === 0) return;

  const container = d3.select("#priceChart");
  container.select("svg").remove();
  d3.select("#priceSection .legend")?.remove();

  const tooltip = container.select(".tooltip-price");
  const margin = { top: 20, right: 60, bottom: 60, left: 70 };
  const width = 800 - margin.left - margin.right;
  const height = 400 - margin.top - margin.bottom;

  const svg = container
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .style("display", "block")
    .style("margin", "auto")
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const dataFiltered = priceData.filter((d) => selected.includes(d.ticker));
  const x = d3
    .scaleTime()
    .domain(d3.extent(dataFiltered, (d) => d.date))
    .range([0, width]);
  const y = d3
    .scaleLinear()
    .domain([
      d3.min(dataFiltered, (d) => d.low),
      d3.max(dataFiltered, (d) => d.high),
    ])
    .nice()
    .range([height, 0]);

  svg
    .append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x));
  svg.append("g").call(d3.axisLeft(y));

  svg
    .append("text")
    .attr("transform", `translate(${width / 2},${height + 40})`)
    .style("text-anchor", "middle")
    .text("Fecha");

  svg
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", -50)
    .attr("x", -height / 2)
    .style("text-anchor", "middle")
    .text("Precio de la acción $");

  // Asignación estática de colores por ticker
  const tickerColorMap = {};
  selected.forEach((ticker, i) => {
    tickerColorMap[ticker] = candleColors[i % candleColors.length];
  });

  const grouped = d3.groups(dataFiltered, (d) => d.ticker);
  const candleGroups = {};

  grouped.forEach(([ticker, values]) => {
    const [posColor, negColor] = tickerColorMap[ticker];
    const group = svg.append("g").attr("class", `candle-group-${ticker}`);
    candleGroups[ticker] = group;

    group
      .selectAll(`.bar-${ticker}`)
      .data(values)
      .enter()
      .append("line")
      .attr("x1", (d) => x(d.date))
      .attr("x2", (d) => x(d.date))
      .attr("y1", (d) => y(d.high))
      .attr("y2", (d) => y(d.low))
      .attr("stroke", "#444")
      .attr("stroke-width", 1);

    group
      .selectAll(`.candle-${ticker}`)
      .data(values)
      .enter()
      .append("rect")
      .attr("x", (d) => x(d.date) - 3)
      .attr("y", (d) => y(Math.max(d.open, d.close)))
      .attr("width", 6)
      .attr("height", (d) => Math.abs(y(d.open) - y(d.close)))
      .attr("fill", (d) => (d.close > d.open ? posColor : negColor))
      .on("mouseover", (e, d) => {
        tooltip
          .html(
            `<strong>${ticker}</strong><br>${d.date.toLocaleDateString()}<br>Open: ${
              d.open
            }<br>High: ${d.high}<br>Low: ${d.low}<br>Close: ${d.close}`
          )
          .style("left", `${e.layerX + 10}px`)
          .style("top", `${e.layerY}px`)
          .style("visibility", "visible");
      })
      .on("mouseout", () => tooltip.style("visibility", "hidden"));

    // Línea de cierre
    const line = d3
      .line()
      .x((d) => x(d.date))
      .y((d) => y(d.close))
      .curve(d3.curveMonotoneX);

    group
      .append("path")
      .datum(values.sort((a, b) => a.date - b.date))
      .attr("fill", "none")
      .attr("stroke", posColor)
      .attr("stroke-width", 1.5)
      .attr("d", line);
  });

  // Leyenda coherente
  const legend = d3
    .select("#priceSection")
    .append("div")
    .attr("class", "legend")
    .style("margin-top", "10px");

  selected.forEach((t) => {
    const [posColor, negColor] = tickerColorMap[t];
    const item = legend
      .append("div")
      .attr("class", "legend-item")
      .style("cursor", "pointer")
      .html(
        `<span class="legend-color" style="background:${posColor}"></span> ${t} (↑)<span class="legend-color" style="background:${negColor}; margin-left:10px"></span> (↓)`
      );

    item.on("click", () => {
      if (focusedTickerPrice === t) {
        focusedTickerPrice = null;
        Object.values(candleGroups).forEach((g) => g.style("opacity", 1));
      } else {
        focusedTickerPrice = t;
        Object.entries(candleGroups).forEach(([tk, g]) =>
          g.style("opacity", tk === t ? 1 : 0.1)
        );
      }
    });
  });
}
