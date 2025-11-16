import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController, IonIcon, IonCardContent, IonHeader, IonCard, IonToolbar, IonTitle, IonContent, IonItem, IonLabel, IonInput, IonButton } from '@ionic/angular/standalone'; // Ionic standalone imports
import { FormsModule } from '@angular/forms'; // Required for ngModel
import { CommonModule } from '@angular/common'; // Required for ngIf, ngFor etc.
import { AuthService } from 'src/app/services/auth';
import { mailOutline, lockClosedOutline } from 'ionicons/icons';
import { addIcons } from 'ionicons';


@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonItem,
    IonInput,
    IonButton,
    IonCard,
    IonCardContent,
    IonIcon
  ]
})
export class LoginPage implements OnInit {
  email = '';
  password = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastController: ToastController
  ) {
    addIcons({ mailOutline, lockClosedOutline });

  }

  ngOnInit() {
    // If user is already logged in, redirect to home
    if (this.authService.currentUserValue) {
      this.router.navigateByUrl('/tabs/tab1');
    }
  }

  async onLogin() {
    try {
      await this.authService.login({ email: this.email, password: this.password }).toPromise();
      this.presentToast('Login successful!', 'success');
      setTimeout(() => {
        this.router.navigateByUrl('/tabs/tab1'); // Redirect to home/dashboard
      }, 1000);
    } catch (error: any) {
      console.error("Login error:", error); // Log the actual error
      this.presentToast(error.message || 'Login failed. Please check your credentials.', 'danger');
    }
  }

  registerPage(){
    this.router.navigateByUrl('/register'); // Redirect to home/dashboard
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
}