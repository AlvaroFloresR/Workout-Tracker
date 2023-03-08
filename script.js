"use strict";

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const form = document.querySelector(".form");
const containerWorkouts = document.querySelector(".workouts");
const inputType = document.querySelector(".form__input--type");
const inputDistance = document.querySelector(".form__input--distance");
const inputDuration = document.querySelector(".form__input--duration");
const inputCadence = document.querySelector(".form__input--cadence");
const inputElevation = document.querySelector(".form__input--elevation");

class Workout {
  // Private
  #numClicks = 0;
  // Public Fields
  date = new Date();

  id =
    (Date.now() + "").slice(-10) + String(Math.trunc(Math.random() * 99 + 1)); // TODO: Add ID Generator API

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lon]
    this.distance = distance; // km
    this.duration = duration; // min
  }

  setDescription() {
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(
      1
    )} on  ${months[this.date.getMonth()]} ${this.date.getDate()}`;
  }

  addClick() {
    this.#numClicks++;
    console.log(this.#numClicks);
  }
}

class Running extends Workout {
  type = "running";
  emoji = "🏃🏼‍♂️";
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;

    this.calcPace();
    this.setDescription();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = "cycling";
  emoji = "🚴🏼";
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;

    this.calcSpeed();
    this.setDescription();
  }

  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// -------------------------------------------------
//                  App Class (No Parent)
// -------------------------------------------------
class App {
  // Private Fields
  #map;
  #mapEvent;
  #workouts = [];
  #mapZoom = 13;

  constructor() {
    // Restart Form
    this.restartForm();

    // Start Map
    this.#getPosition();

    // Load Local Storage
    this.#loadFromLocalStorage();

    // Form Submit Event Listener
    form.addEventListener("submit", this.#newWorkout.bind(this));

    // Dropdown Event Listener
    inputType.addEventListener("change", this.#toggleElevationField.bind(this));

    // Workout Click Event Listener
    containerWorkouts.addEventListener("click", this.#moveToPopup.bind(this));
  }

  restartForm() {
    inputCadence.value = "";
    inputDistance.value = "";
    inputDuration.value = "";
    inputElevation.value = "";
    inputType.value = "running";

    // Hide Form
    form.style.display = "none";
    form.classList.add("hidden");
    setTimeout(() => (form.style.display = "grid"), 1000);
  }

  #getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this.#loadMap.bind(this),
        function () {
          alert("Could not get your position");
        }
      );
  }

  #loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    console.log(`Lat: ${latitude}\nLon: ${longitude}`);

    const coords = [latitude, longitude];
    // Quick Start Leaflet
    this.#map = L.map("map").setView(coords, this.#mapZoom);
    L.tileLayer("https://{s}.tile.openstreetmap.de/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(this.#map);

    // Handling click on map
    this.#map.on("click", this.#showForm.bind(this));

    // Render workout after map has loaded with loaded data
    this.#workouts.forEach((indWorkout) => this.#renderWorkout(indWorkout));
  }

  #showForm(mapE) {
    this.#mapEvent = mapE;
    // Form Manipulation
    form.classList.remove("hidden");

    inputDistance.focus();
  }

  #toggleElevationField(e) {
    inputElevation.closest(".form__row").classList.toggle("form__row--hidden");
    inputCadence.closest(".form__row").classList.toggle("form__row--hidden");
  }

  #newWorkout(e) {
    // Validation Methods
    const validInputs = (...inputs) =>
      inputs.every((inp) => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every((sing) => sing > 0);

    // Prevent form reloading page
    e.preventDefault();

    // Get data from from
    const type = inputType.value;
    const distance = Number(inputDistance.value);
    const duration = Number(inputDuration.value);
    const { lat: clickLat, lng: clickLong } = this.#mapEvent.latlng;
    let coords = [clickLat, clickLong];
    let workout;

    if (type === "running") {
      const cadence = Number(inputCadence.value);

      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert("Input has to be positive numbers!");

      // Create Running object
      workout = new Running(coords, distance, duration, cadence);
    }
    if (type === "cycling") {
      const elevation = Number(inputElevation.value);
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert("Input has to be positive numbers!");

      // Create Running object
      workout = new Cycling(coords, distance, duration, elevation);
    }

    // Append workouts
    this.#workouts.push(workout);

    // Render Workout on GUI
    this.#renderWorkout(workout);

    // Clear form
    this.restartForm();

    // Save to local storage
    this.#saveToLocalStorage();
  }

  #saveToLocalStorage() {
    localStorage.setItem("workoutSave", JSON.stringify(this.#workouts));
  }

  #loadFromLocalStorage() {
    const loadedData = JSON.parse(localStorage.getItem("workoutSave"));

    if (!loadedData) return;

    this.#workouts = loadedData;
  }
  #renderWorkoutMarker(workout) {
    // Add Marker on Position

    let marker = L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(workout.emoji + workout.description)
      .openPopup();
  }

  #moveToPopup(e) {
    // Look for Closest workout
    const workoutEl = e.target.closest(".workout");
    if (!workoutEl) return;

    // Find workout based on id
    const workout = this.#workouts.find(
      (work) => work.id === workoutEl.dataset.id
    );

    // Move to Coordinates of workout
    this.#map.setView(workout.coords, this.#mapZoom, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  #renderWorkout(workout) {
    // Render Marker on Map
    this.#renderWorkoutMarker(workout);

    // Code to Render List
    let htmlWorkout = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.description}</h2>
        <div class="workout__details">
        <span class="workout__icon">${workout.emoji}</span>
        <span class="workout__value">${workout.distance}</span>
        <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
        <span class="workout__icon">⏱</span>
        <span class="workout__value">${workout.duration}</span>
        <span class="workout__unit">min</span>
        </div>
        
    `;

    if (workout.type === "running") {
      htmlWorkout += `
            <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
            </div>
            <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
            </div>
        </li>
        `;
    }
    if (workout.type === "cycling") {
      htmlWorkout += `<div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.speed.toFixed(1)}</span>
        <span class="workout__unit">km/h</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⛰</span>
        <span class="workout__value">${workout.elevationGain}</span>
        <span class="workout__unit">m</span>
      </div>
    </li>`;
    }

    form.insertAdjacentHTML("afterend", htmlWorkout);
  }

  // To be accesed with console
  reset() {
    localStorage.removeItem("workoutSave");
    location.reload();
  }
}

const app = new App();
