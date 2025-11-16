import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController, IonCard, IonCardContent, IonIcon, IonHeader, IonToolbar, IonTitle, IonContent, IonItem, IonLabel, IonInput, IonButton } from '@ionic/angular/standalone'; // Ionic standalone imports
import { FormsModule } from '@angular/forms'; // Required for ngModel
import { CommonModule } from '@angular/common'; // Required for ngIf, ngFor etc.

import { AuthService } from 'src/app/services/auth';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: true, // Mark as standalone
  imports: [
    CommonModule, // For common directives like *ngIf, *ngFor
    FormsModule,  // For [(ngModel)]
    IonCard, IonCardContent, IonIcon, 
    IonContent,
    IonItem,
    IonInput,
    IonButton,
  ]
})
export class RegisterPage implements OnInit {
  name = '';
  email = '';
  password = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastController: ToastController // ToastController is a service, not a component, so no need for `imports` array
  ) {}

  ngOnInit() {}

  async onRegister() {
    try {
      await this.authService.register({ name: this.name, email: this.email, password: this.password }).toPromise();
      this.presentToast('Registration successful! Redirecting to login...', 'success');
      setTimeout(() => {
        this.router.navigateByUrl('/login');
      }, 1500);
    } catch (error: any) {
      console.error("Registration error:", error); // Log the actual error
      this.presentToast(error.message || 'Registration failed. Please try again.', 'danger');
    }
  }

  async presentToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'bottom'
    });
    toast.present();
  }

  loginPage(){
    this.router.navigateByUrl('/login');
  }
}