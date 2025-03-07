import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { SaveStatusService } from './components/shared/save-status/save-status.service';
import { ConnectionStatusService } from './components/shared/connection-status/connection-status.service';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent implements OnInit {
  saveState$!: Observable<any>;
  connectionState$!: Observable<any>;
  
  constructor(private saveStatusService: SaveStatusService, private connectionStatusService: ConnectionStatusService) {}
  
  ngOnInit() {
    // Get save status state observable
    this.saveState$ = this.saveStatusService.getState();
    this.connectionState$ = this.connectionStatusService.getState();
  }

  onDismissConnectionStatus() {
    this.connectionStatusService.hide();
  }
}