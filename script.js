// script.js
let fullData1 = [];

// Cargar datos
function loadData() {
  d3.csv("data3.csv").then((raw) => {
    fullData1 = raw.map((d) => ({
      sector: d["Fundamentals_Sector_2025_4"].trim(),
      industry: d["Fundamentals_Industry_2025_4"].trim(),
      ticker: d["Ticker"].trim(),
      company: d["Company Name"].trim(),
      country: d["Fundamentals_Country_2025_4"].trim(),
      marketCap: +d["Fundamentals_Market Cap_2025_4"],
      // Confirmado: graficamos este campo
      femalePct: +d["Fundamentals_Officer_%female_2025_4"] * 100,
    }));

    // Bubble chart
    initFilters1();
    drawViz1();
    d3.select("#toggleTickers").on("change", drawViz1);

    // Boxplot
    initFilters2();
    drawViz2();
  });
}

// UtilidadesF
function uniq(data, key) {
  return Array.from(new Set(data.map((d) => d[key]))).sort();
}
function populate(sel, arr) {
  const s = d3.select(sel);
  s.html('<option value="All">Todos</option>');
  arr.forEach((v) => s.append("option").attr("value", v).text(v));
}

// --- VIZ 1: Bubble Pack ---
function initFilters1() {
  populate("#countryFilter1", uniq(fullData1, "country"));
  populate("#sectorFilter1", uniq(fullData1, "sector"));
  populate("#industryFilter1", uniq(fullData1, "industry"));
  populate("#tickerFilter1", uniq(fullData1, "ticker"));
  d3.select("#applyFilters1").on("click", drawViz1);
}

function getFilters1() {
  return {
    country: d3.select("#countryFilter1").property("value"),
    sector: d3.select("#sectorFilter1").property("value"),
    industry: d3.select("#industryFilter1").property("value"),
    ticker: d3.select("#tickerFilter1").property("value"),
    min: +d3.select("#marketCapMin1").property("value"),
    max: +d3.select("#marketCapMax1").property("value"),
  };
}

function drawViz1() {
  const f = getFilters1();
  const data = fullData1.filter(
    (d) =>
      (f.country === "All" || d.country === f.country) &&
      (f.sector === "All" || d.sector === f.sector) &&
      (f.industry === "All" || d.industry === f.industry) &&
      (f.ticker === "All" || d.ticker === f.ticker) &&
      d.marketCap >= f.min &&
      d.marketCap <= f.max
  );
  const showTickers = d3.select("#toggleTickers").property("checked");

  const container = d3.select("#chart1");
  container.select("svg").remove();
  const tooltip = container.select(".tooltip1");
  const width = 560,
    height = 560;

  // jerarquía
  const root = d3
    .hierarchy({
      children: d3
        .groups(data, (d) => d.sector)
        .map(([s, sd]) => ({
          name: s,
          children: d3
            .groups(sd, (d) => d.industry)
            .map(([i, id]) => ({
              name: i,
              children: d3
                .groups(id, (d) => d.ticker)
                .map(([t, td]) => ({
                  name: t,
                  company: td[0].company,
                  value: d3.sum(td, (x) => x.marketCap),
                })),
            })),
        })),
    })
    .sum((d) => d.value);

  d3.pack().size([width, height]).padding(3)(root);

  const svg = container
    .append("svg")
    .attr("width", width)
    .attr("height", height);
  const color = d3.scaleOrdinal(d3.schemeCategory10);

  let focus = root,
    view = [root.x, root.y, root.r * 2];

  // Círculos
  const nodes = svg
    .selectAll("circle")
    .data(root.descendants())
    .enter()
    .append("circle")
    .attr("fill", (d) => (d.children ? color(d.depth) : "#fff"))
    .attr("pointer-events", "all")
    .on("mouseover", (e, d) => {
      const txt =
        d.depth === 1
          ? `Sector: ${d.data.name}`
          : d.depth === 2
          ? `Industria: ${d.data.name}`
          : `Ticker: ${d.data.name} – ${d.data.company}`;
      tooltip
        .html(`${txt}<br>Market Cap: ${d.value.toLocaleString()}`)
        .style("visibility", "visible");
    })
    .on("mousemove", (e, d) => {
      // Tooltip justo en la posición del cursor
      const [x, y] = d3.pointer(e, container.node());
      tooltip.style("left", `${x}px`).style("top", `${y}px`);
    })
    .on("mouseout", () => tooltip.style("visibility", "hidden"))
    .on("click", (e, d) => {
      if (d.children) {
        zoom(d);
        e.stopPropagation();
      }
    });

  // Etiquetas
  const labels = svg
    .selectAll("text")
    .data(root.descendants())
    .enter()
    .append("text")
    .attr("text-anchor", "middle")
    .attr("dy", "0.3em")
    .text((d) => d.data.name)
    .attr("opacity", (d) =>
      d.depth === 1 ||
      (d.depth === 2 && focus.depth === 1) ||
      (d.depth === 3 && focus.depth === 2 && showTickers)
        ? 1
        : 0
    );

  svg.on("click", () => zoom(root));
  zoomTo(view);

  function zoom(d) {
    focus = d;
    const t = svg.transition().duration(750);
    t.tween("zoom", () => {
      const i = d3.interpolateZoom(view, [focus.x, focus.y, focus.r * 2]);
      return (t) => zoomTo(i(t));
    });
    labels
      .transition(t)
      .attr("opacity", (d) =>
        d.depth === 1 ||
        (d.depth === 2 && focus.depth === 1) ||
        (d.depth === 3 && focus.depth === 2 && showTickers)
          ? 1
          : 0
      );
  }

  function zoomTo(v) {
    view = v;
    const k = width / v[2];
    nodes
      .attr(
        "transform",
        (d) =>
          `translate(${(d.x - v[0]) * k + width / 2},${
            (d.y - v[1]) * k + height / 2
          })`
      )
      .attr("r", (d) => d.r * k);
    labels.attr(
      "transform",
      (d) =>
        `translate(${(d.x - v[0]) * k + width / 2},${
          (d.y - v[1]) * k + height / 2
        })`
    );
  }
}

// VIZ 2: Boxplot

function initFilters2() {
  populate("#countryFilter2", uniq(fullData1, "country"));
  populate("#sectorFilter2", uniq(fullData1, "sector"));
  populate("#industryFilter2", uniq(fullData1, "industry"));
  populate("#tickerFilter2", uniq(fullData1, "ticker"));

  // Opciones de agrupación
  const groupOpts = [
    { value: "country", text: "País" },
    { value: "sector", text: "Sector" },
    { value: "industry", text: "Industria" },
  ];
  const gb = d3.select("#groupBy");
  groupOpts.forEach((o) =>
    gb.append("option").attr("value", o.value).text(o.text)
  );
  gb.on("change", () => {
    d3.select("#groupByLabel").text(
      gb.select("option:checked").text().toLowerCase()
    );
  });

  d3.select("#applyFilters2").on("click", drawViz2);
}

function getFilters2() {
  return {
    groupBy: d3.select("#groupBy").property("value"),
    country: d3.select("#countryFilter2").property("value"),
    sector: d3.select("#sectorFilter2").property("value"),
    industry: d3.select("#industryFilter2").property("value"),
    ticker: d3.select("#tickerFilter2").property("value"),
    min: +d3.select("#marketCapMin2").property("value"),
    max: +d3.select("#marketCapMax2").property("value"),
  };
}

function drawViz2() {
  const f = getFilters2();
  const data = fullData1.filter(
    (d) =>
      (f.country === "All" || d.country === f.country) &&
      (f.sector === "All" || d.sector === f.sector) &&
      (f.industry === "All" || d.industry === f.industry) &&
      (f.ticker === "All" || d.ticker === f.ticker) &&
      d.marketCap >= f.min &&
      d.marketCap <= f.max
  );
  const groupKey = f.groupBy;
  const groupKeyLabel = d3.select("#groupBy").select("option:checked").text();

  // Estadísticas por grupo
  const grouped = d3.groups(data, (d) => d[groupKey]);
  const stats = grouped.map(([key, vals]) => {
    const arr = vals.map((d) => d.femalePct).sort(d3.ascending);
    return {
      key,
      q1: d3.quantile(arr, 0.25),
      median: d3.quantile(arr, 0.5),
      q3: d3.quantile(arr, 0.75),
      min: d3.min(arr),
      max: d3.max(arr),
    };
  });

  const container = d3.select("#chart2");
  container.select("svg").remove();
  const tooltip = container.select(".tooltip2");
  const margin = { top: 40, right: 30, bottom: 110, left: 60 };
  const width = 700 - margin.left - margin.right;
  const height = 450 - margin.top - margin.bottom;

  const svg = container
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Título del gráfico
  svg
    .append("text")
    .attr("class", "chart-title")
    .attr("x", width / 2)
    .attr("y", -margin.top / 2)
    .attr("text-anchor", "middle")
    .text(
      `Distribución % mujeres en puestos directivos de las empresas cotizadas por ${groupKeyLabel.toLowerCase()}`
    );

  // Escalas
  const x = d3
    .scaleBand()
    .domain(stats.map((d) => d.key))
    .range([0, width])
    .paddingInner(0.5)
    .paddingOuter(0.25);

  const y = d3
    .scaleLinear()
    .domain([0, d3.max(stats, (d) => d.max)])
    .nice()
    .range([height, 0]);

  // Ejes
  svg
    .append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .attr("transform", "rotate(45)")
    .style("text-anchor", "start");

  svg.append("g").attr("class", "axis").call(d3.axisLeft(y));

  // Labels de ejes
  svg
    .append("text")
    .attr("class", "axis-label")
    .attr("x", width / 2)
    .attr("y", height + margin.bottom - 15)
    .attr("text-anchor", "middle")
    .text(groupKeyLabel);
  svg
    .append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -margin.left + 15)
    .attr("text-anchor", "middle")
    .text("% mujeres en puestos directivos");

  // Paleta de colores
  const colorScale = d3
    .scaleOrdinal(d3.schemeCategory10)
    .domain(stats.map((d) => d.key));

  //boxplots con tooltip
  const boxWidth = x.bandwidth();
  const boxes = svg
    .selectAll(".boxplot")
    .data(stats)
    .enter()
    .append("g")
    .attr("transform", (d) => `translate(${x(d.key)},0)`);

  boxes
    .append("rect")
    .attr("class", "box")
    .attr("x", 0)
    .attr("y", (d) => y(d.q3))
    .attr("width", boxWidth)
    .attr("height", (d) => y(d.q1) - y(d.q3))
    .attr("fill", (d) => colorScale(d.key))
    .on("mouseover", (e, d) => {
      const mean = d3
        .mean(
          data.filter((x) => x[groupKey] === d.key),
          (x) => x.femalePct
        )
        .toFixed(2);
      tooltip
        .html(
          `<strong>${groupKeyLabel}: ${d.key}</strong><br>` +
            `Media: ${mean}%<br>` +
            `Q1: ${d.q1.toFixed(2)}%<br>` +
            `Mediana (Q2): ${d.median.toFixed(2)}%<br>` +
            `Q3: ${d.q3.toFixed(2)}%`
        )
        .style("visibility", "visible");
    })
    .on("mousemove", (e) => {
      const [xPos, yPos] = d3.pointer(e, container.node());
      tooltip.style("left", `${xPos + 10}px`).style("top", `${yPos + 10}px`);
    })
    .on("mouseout", () => tooltip.style("visibility", "hidden"));

  boxes
    .append("line")
    .attr("class", "line")
    .attr("x1", 0)
    .attr("x2", boxWidth)
    .attr("y1", (d) => y(d.median))
    .attr("y2", (d) => y(d.median));

  boxes
    .append("line")
    .attr("class", "line")
    .attr("x1", boxWidth / 2)
    .attr("x2", boxWidth / 2)
    .attr("y1", (d) => y(d.min))
    .attr("y2", (d) => y(d.q1));

  boxes
    .append("line")
    .attr("class", "line")
    .attr("x1", boxWidth / 2)
    .attr("x2", boxWidth / 2)
    .attr("y1", (d) => y(d.q3))
    .attr("y2", (d) => y(d.max));

  boxes
    .append("line")
    .attr("class", "line")
    .attr("x1", boxWidth * 0.25)
    .attr("x2", boxWidth * 0.75)
    .attr("y1", (d) => y(d.min))
    .attr("y2", (d) => y(d.min));

  boxes
    .append("line")
    .attr("class", "line")
    .attr("x1", boxWidth * 0.25)
    .attr("x2", boxWidth * 0.75)
    .attr("y1", (d) => y(d.max))
    .attr("y2", (d) => y(d.max));
}

// Inicializar todo
loadData();
