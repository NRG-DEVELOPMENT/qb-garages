// script.js
window.addEventListener("message", function (event) {
    const data = event.data;
    if (data.action === "VehicleList") {
        const garageLabel = data.garageLabel;
        const vehicles = data.vehicles;
        populateVehicleList(garageLabel, vehicles);
        displayUI();
    }
});

document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
        closeGarageMenu();
    }
});

function displayUI() {
    const container = document.querySelector(".container");
    container.classList.add("active");
    
    // Animate vehicle items sequentially
    const vehicles = document.querySelectorAll('.vehicle-item');
    vehicles.forEach((vehicle, index) => {
        setTimeout(() => {
            vehicle.classList.add('fade-in');
        }, index * 100);
    });
}

function closeGarageMenu() {
    const container = document.querySelector(".container");
    container.classList.remove("active");

    fetch("https://qb-garages/closeGarage", {
        method: "POST",
        headers: {
            "Content-Type": "application/json; charset=UTF-8",
        },
        body: JSON.stringify({}),
    }).then(response => response.json())
      .then(data => {
        if (data !== "ok") {
            console.error("Failed to close Garage UI");
        }
    });
}

function populateVehicleList(garageLabel, vehicles) {
    const vehicleContainerElem = document.querySelector(".vehicle-table");
    const fragment = document.createDocumentFragment();
    
    // Clear existing vehicles
    vehicleContainerElem.innerHTML = '';

    // Update garage header
    const garageHeader = document.getElementById("garage-header");
    garageHeader.textContent = garageLabel;

    vehicles.forEach((v, index) => {
        const vehicleItem = createVehicleElement(v, index);
        fragment.appendChild(vehicleItem);
    });

    vehicleContainerElem.appendChild(fragment);
    initializeTooltips();
}

function createVehicleElement(v, index) {
    const vehicleItem = document.createElement("div");
    vehicleItem.classList.add("vehicle-item");
    vehicleItem.style.animationDelay = `${index * 0.1}s`;

    // Vehicle Info Section
    const vehicleInfo = createVehicleInfo(v);
    vehicleItem.appendChild(vehicleInfo);

    // Stats Section
    const stats = createVehicleStats(v);
    vehicleItem.appendChild(stats);

    // Finance and Drive Section
    const actionSection = createActionSection(v);
    vehicleItem.appendChild(actionSection);

    return vehicleItem;
}

function createVehicleInfo(v) {
    const vehicleInfo = document.createElement("div");
    vehicleInfo.classList.add("vehicle-info");

    const name = document.createElement("div");
    name.classList.add("vehicle-name");
    name.innerHTML = `<i class='bx bxs-car'></i> ${v.vehicleLabel}`;

    const plate = document.createElement("div");
    plate.classList.add("plate");
    plate.innerHTML = `<i class='bx bx-card'></i> ${v.plate}`;

    const mileage = document.createElement("div");
    mileage.classList.add("mileage");
    mileage.innerHTML = `<i class='bx bx-trip'></i> ${v.distance}mi`;

    vehicleInfo.appendChild(name);
    vehicleInfo.appendChild(plate);
    vehicleInfo.appendChild(mileage);

    return vehicleInfo;
}

function createVehicleStats(v) {
    const stats = document.createElement("div");
    stats.classList.add("stats");

    const statTypes = [
        { name: "Fuel", value: v.fuel, max: 100, icon: 'bx-gas-pump' },
        { name: "Engine", value: v.engine, max: 1000, icon: 'bx-cog' },
        { name: "Body", value: v.body, max: 1000, icon: 'bx-car' }
    ];

    statTypes.forEach(stat => {
        const statElement = createStatElement(stat);
        stats.appendChild(statElement);
    });

    return stats;
}

function createStatElement(stat) {
    const statDiv = document.createElement("div");
    statDiv.classList.add("stat");

    const label = document.createElement("div");
    label.classList.add("label");
    label.innerHTML = `<i class='bx ${stat.icon}'></i> ${stat.name}`;

    const progressBar = document.createElement("div");
    progressBar.classList.add("progress-bar");

    const percentage = (stat.value / stat.max) * 100;
    const progress = document.createElement("span");
    progress.style.width = `${percentage}%`;
    
    if (percentage >= 75) {
        progress.classList.add("bar-green");
    } else if (percentage >= 50) {
        progress.classList.add("bar-yellow");
    } else {
        progress.classList.add("bar-red");
    }

    const progressText = document.createElement("div");
    progressText.classList.add("progress-text");
    progressText.textContent = `${Math.round(percentage)}%`;

    progressBar.appendChild(progress);
    progressBar.appendChild(progressText);
    statDiv.appendChild(label);
    statDiv.appendChild(progressBar);

    return statDiv;
}

function createActionSection(v) {
    const container = document.createElement("div");
    container.classList.add("finance-drive-container");

    // Finance Info
    const financeInfo = document.createElement("div");
    financeInfo.classList.add("finance-info");
    financeInfo.innerHTML = v.balance > 0 
        ? `<i class='bx bx-money'></i> $${v.balance.toFixed(0)}`
        : `<i class='bx bx-check'></i> Paid Off`;

    // Drive Button
    const driveBtn = createDriveButton(v);

    container.appendChild(financeInfo);
    container.appendChild(driveBtn);

    return container;
}

function createDriveButton(v) {
    const button = document.createElement("button");
    button.classList.add("drive-btn");
    
    let status = determineVehicleStatus(v);
    button.textContent = status;
    button.disabled = status === "Depot" || status === "Impound";
    
    if (status === "Out" || button.disabled) {
        button.classList.add("disabled");
    }

    button.addEventListener("click", () => handleDriveButton(v, status));
    
    return button;
}

function determineVehicleStatus(v) {
    if (v.state === 0) {
        return v.depotPrice > 0 ? (v.type === "public" ? "Depot" : `$${v.depotPrice.toFixed(0)}`) : "Out";
    } else if (v.state === 1) {
        return v.depotPrice > 0 ? (v.type === "depot" ? `$${v.depotPrice.toFixed(0)}` : "Depot") : "Drive";
    }
    return "Impound";
}

function handleDriveButton(v, status) {
    const vehicleData = {
        vehicle: v.vehicle,
        garage: v.garage,
        index: v.index,
        plate: v.plate,
        type: v.type,
        depotPrice: v.depotPrice,
        stats: {
            fuel: v.fuel,
            engine: v.engine,
            body: v.body
        }
    };

    if (status === "Out") {
        trackVehicle(v.plate);
    } else if (v.depotPrice > 0) {
        takeOutDepot(vehicleData);
    } else {
        takeOutVehicle(vehicleData);
    }
}

function initializeTooltips() {
    // Add tooltips functionality if needed
}

// Helper functions for API calls
function trackVehicle(plate) {
    fetch("https://qb-garages/trackVehicle", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=UTF-8" },
        body: JSON.stringify(plate)
    })
    .then(response => response.json())
    .then(data => {
        if (data === "ok") closeGarageMenu();
    });
}

function takeOutDepot(vehicleData) {
    fetch("https://qb-garages/takeOutDepo", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=UTF-8" },
        body: JSON.stringify(vehicleData)
    })
    .then(response => response.json())
    .then(data => {
        if (data === "ok") closeGarageMenu();
    });
}

function takeOutVehicle(vehicleData) {
    fetch("https://qb-garages/takeOutVehicle", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=UTF-8" },
        body: JSON.stringify(vehicleData)
    })
    .then(response => response.json())
    .then(data => {
        if (data === "ok") closeGarageMenu();
    });
}
