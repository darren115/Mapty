'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class Workout {
  // date = new Date();
  //   id = (Date.now() + '').slice(-10);
  id = this._guid();
  clicks = 0;

  constructor(coords, distance, duration, date = new Date()) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
    this.date = date;
  }

  _guid() {
    let s4 = () => {
      return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
    };
    //return id of format 'aaaaaaaa'-'aaaa'-'aaaa'-'aaaa'-'aaaaaaaaaaaa'
    //prettier-ignore
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence, date = new Date()) {
    super(coords, distance, duration, date);
    this.cadence = cadence;
    this.calcPace();

    this._setDescription();
  }

  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevation, date = new Date()) {
    super(coords, distance, duration, date);
    this.elevation = elevation;
    this.calcSpeed();

    this._setDescription();
  }

  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

class App {
  #map;
  #mapEvent;
  #workouts = [];
  #markers = [];

  #mapZoomLevel = 13;

  constructor() {
    this._getPosition();

    this._getLocalStorage();

    form.addEventListener('submit', this._newWorkout.bind(this));

    inputType.addEventListener('change', this._toggleElevationField);

    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your location');
        }
      );
    }
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    //   console.log(`http://google.pt/maps/@${latitude},${longitude}`);

    //   const map = L.map('map').setView([51.505, -0.09], 13);
    const coords = [latitude, longitude];
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');

    inputDistance.focus();
  }

  _hideForm() {
    inputDistance.value = '';
    inputDuration.value = '';
    inputElevation.value = '';
    inputCadence.value = '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => {
      form.style.display = 'grid';
    }, 1000);
    //form.style.display = 'grid';
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    e.preventDefault();

    const validInputs = (...inputs) => {
      return inputs.every(inp => Number.isFinite(inp));
    };

    const allPositives = (...inputs) => {
      return inputs.every(inp => inp > 0);
    };

    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    if (type === 'running') {
      const cadence = +inputCadence.value;

      if (
        !validInputs(distance, duration, cadence) ||
        !allPositives(distance, duration, cadence)
      ) {
        return alert('Running Inputs have to be a positive number');
      }

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositives(distance, duration)
      )
        return alert('Cycling Inputs have to be a positive number');

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    this.#workouts.push(workout);

    this._renderWorkoutMarker(workout);

    this._renderWorkout(workout);

    this._hideForm();

    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    const myMarker = L.marker(workout.coords)
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
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();

    myMarker._id = workout.id;
    this.#markers.push(myMarker);
  }

  _clearMarker(id) {
    var self = this;
    var new_markers = [];
    this.#markers.forEach(function (marker) {
      if (marker._id === id) {
        self.#map.removeLayer(marker);
      } else new_markers.push(marker);
    });
    this.#markers = new_markers;
  }

  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id=${workout.id}>
    <div class="workout__header">
          <h2 class="workout__title">${workout.description}</h2>
          <button class="workout__edit workout__btn" data-id=${
            workout.id
          }>Edit</button>
          <button class="workout__delete workout__btn" data-id=${
            workout.id
          }>Remove</button>
          </div>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>`;

    if (workout.type === 'running') {
      html += `
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
        </li>`;
    }

    if (workout.type === 'cycling') {
      html += `
        <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.speed.toFixed(1)}</span>
        <span class="workout__unit">km/h</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⛰</span>
        <span class="workout__value">${workout.elevation}</span>
        <span class="workout__unit">m</span>
      </div>
    </li>`;
    }

    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e) {
    if (e.target.classList.contains('workout__delete')) {
      this._removeWorkout(e);
      return;
    }
    if (e.target.classList.contains('workout__edit')) {
      this._editWorkout(e);
      return;
    }

    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
    workout.click();
  }

  _editWorkout(e) {
    const workout = this.#workouts.find(
      work => work.id === e.target.dataset.id
    );

    const temp = this.#workouts.filter(work => {
      return work.id != e.target.dataset.id;
    });

    // console.log(workout);

    //need to make a new workout and set its details to the current workout details
    inputType.value = `${workout.type}`;
    inputDistance.value = `${workout.distance}`;
    inputDuration.value = `${workout.duration}`;
    inputElevation.value = `${workout.elevation}`;
    inputCadence.value = `${workout.cadence}`;
    this._showForm();
    //this._newWorkout();

    // form
    // const element = document.querySelector(`[data-id='${workout.id}']`);
    // element.parentNode.removeChild(element);
    // element.remove();

    //uncomment this to give full functionality
    //this._setLocalStorage();
  }

  _removeWorkout(e) {
    const workout = this.#workouts.find(
      work => work.id === e.target.dataset.id
    );

    this._clearMarker(workout.id);

    // form
    const element = document.querySelector(`[data-id='${workout.id}']`);
    // element.parentNode.removeChild(element);
    element.remove();

    //uncomment this to give full functionality
    //this._setLocalStorage();
  }

  _setLocalStorage() {
    localStorage.setItem('workout', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workout'));

    if (!data) return;

    //Creates correct objects based on returned data rather than generic objects that would be assigned using other method
    //changes ID which causes issues
    data.forEach(obj => {
      // console.log(obj.type)
      if (obj.type === 'running') {
        const workout = new Running(
          obj.coords,
          obj.distance,
          obj.duration,
          obj.cadence,
          new Date(obj.date)
        );
        // workout.date = obj.date;
        // console.log(workout.date);
        workout.id = obj.id;
        this.#workouts.push(workout);
        this._renderWorkout(workout);
      }

      if (obj.type === 'cycling') {
        const workout = new Cycling(
          obj.coords,
          obj.distance,
          obj.duration,
          obj.elevation,
          new Date(obj.date)
        );
        // workout.date = obj.date;
        // console.log(workout.date);
        workout.id = obj.id;
        this.#workouts.push(workout);
        this._renderWorkout(workout);
      }
    });

    // console.log(data);
    // this.#workouts = data;
    // this.#workouts.forEach(work => {
    //   this._renderWorkout(work);
    // });
  }

  reset() {
    localStorage.removeItem('workout');
    location.reload();
  }
}

const app = new App();
