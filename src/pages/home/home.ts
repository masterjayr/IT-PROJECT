import { Component, ViewChild, ElementRef, NgZone } from '@angular/core';
import { NavController, Platform, AlertController } from 'ionic-angular';
import { Subscription } from 'rxjs/Subscription'
import { Geolocation } from '@ionic-native/geolocation';
import { Storage } from '@ionic/storage'
import { filter } from 'rxjs/operators'
import { TextToSpeech } from '@ionic-native/text-to-speech';


declare var google;

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage {
  @ViewChild('map') mapElement: ElementRef;
  map: any; 
  currentMapTrack = null; 
  marker: any;

  isTracking = false;
  hasStop = false; 

  trackedRoute = [];
  previousTracks = [];

  lastRoute :any;
  lastStop : any;

  positionSubscription: Subscription;
  infowindow = new google.maps.InfoWindow;

  constructor(public navCtrl: NavController, private plt: Platform, private geolocation: Geolocation,
              private storage: Storage, private alertCtrl: AlertController, public zone: NgZone, 
              private text2Speech: TextToSpeech) {

  }

  ionViewDidLoad(){
    this.plt.ready().then(()=>{
      this.loadHistoricRoutes();
      let mapOptions= {
        zoom: 13,
        mapTypeId: google.maps.MapTypeId.HYBRID,
        mapTypeControl: false,
        streetViewControl: true,
        fullscreenControl: true
      }

    this.map = new google.maps.Map(this.mapElement.nativeElement, mapOptions);
    
    

      this.geolocation.getCurrentPosition().then(pos=>{
        let latlng = new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
        this.marker = new google.maps.Marker({
          position: latlng, 
          map: this.map,
          label: "me",
          draggable: false,
          animation: google.maps.Animation.DROP,
        });
       
        this.map.setCenter(latlng);
        this.map.setZoom(15);
      });
    });
  }

  loadHistoricRoutes(){
    this.storage.get('routes').then((data)=>{
      if(data){
        this.previousTracks = data;
      }
    }).catch(err=>{
      console.log(err);
    })
  }

  startTracking(){
    this.isTracking = true; 
    this.trackedRoute  = [];
    this.infowindow.close()

    let options = {
      frequency: 3000, 
      enableHighAccuracy: true
    };     

    this.positionSubscription  = this.geolocation.watchPosition(options)
      .pipe(
        filter(p=>p.coords !== undefined)
      )
      .subscribe(data =>{
        this.zone.run(()=>{
          this.trackedRoute.push({lat: data.coords.latitude, lng: data.coords.longitude});
          this.redrawPath(this.trackedRoute);
          this.marker.setPosition( { lat: data.coords.latitude, lng: data.coords.longitude });
        })
      })

      console.log(this.positionSubscription);
  }

  redrawPath(path){
    if(this.currentMapTrack){
      this.currentMapTrack.setMap(null);
    }

    if(path.length>1){
      this.currentMapTrack = new google.maps.Polyline({
        path: path,
        geodesic: true,
        strokeColor: '#ff00ff',
        strokeOpacity: 1.0,
        strokeWeight: 3
      });

      this.currentMapTrack.setMap(this.map);
    }
  }

  stopTracking(){
    this.hasStop = true;
    var geocoder = new google.maps.Geocoder;
    let newRoute = { finished: new Date().getTime(), path: this.trackedRoute}
    console.log(this.trackedRoute);
    this.lastRoute = this.trackedRoute[this.trackedRoute.length -1];
    console.log(this.lastRoute);
    this.previousTracks.push(newRoute);
    this.storage.set('routes', this.previousTracks);

    this.isTracking = false;
    this.positionSubscription.unsubscribe();
    this.currentMapTrack.setMap(null);

    console.log(this.previousTracks);
    this.geoCodeLatLng(geocoder, this.map, this.infowindow, this.marker);
  }

  showHistoryRoute(route){
    this.redrawPath(route);
  }

  //Now let's Geocode
  geoCodeLatLng(geocoder, map, infowindow, marker){
    var latlng = this.lastRoute;
    geocoder.geocode({"location": latlng}, (result, status)=>{
      console.log(status);
      console.log(result);
      console.log(latlng);
      if(status==google.maps.GeocoderStatus.OK){
        if(result[0]){
          infowindow.setContent(result[0].formatted_address);
          infowindow.open(map, marker);
          this.lastStop = result[0].formatted_address
          console.log(this.lastStop);
        }else{
          alert("No result found");
        }
      }else{
        alert("Geocoder failed due to "+ status)
      }
    })
    this.hasStop = true;
  }

  StartVoiceCurrentLocation(){
    this.hasStop = false;
    let textToOptions = {
      text: this.lastStop,
      locale: "en-US",
      rate: 1
    }

    this.text2Speech.speak(textToOptions).then(()=>{
      console.log("Success");
    }).catch((reason:any)=>{
      console.log(reason);
    })
  }

  // `StopVoiceCurrentLocation(){
  //   this.hasStop = false;
  //   this.text2Speech.stop().then(()=>{
  //     console.log("Stopped");
  //   }).catch((reason:any)=>{
  //     console.log(reason);
  //   })
  // }
}
