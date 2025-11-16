// C:\Users\Ralph Gannaban\Desktop\dev\sideline\chefiq\frontend\src\app\tab4\tab4.page.ts
import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonAvatar, IonIcon, Platform } from '@ionic/angular/standalone';
import { AuthService, UserProfile as AuthUserProfile, AuthResponse } from '../services/auth'; // Renamed UserProfile to AuthUserProfile to avoid conflict
import { UserService, SimpleUser } from '../services/user'; // Import SimpleUser and UserService
import { AlertController, ActionSheetController, ToastController } from '@ionic/angular'; // Import ActionSheet and Toast
import { CommonModule } from '@angular/common'; // Needed for *ngIf, etc. if not already there

@Component({
  selector: 'app-tab4',
  templateUrl: 'tab4.page.html',
  styleUrls: ['tab4.page.scss'],
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonAvatar, IonIcon, IonButton, CommonModule], // Add CommonModule
  providers: [UserService] // Ensure UserService is available
})
export class Tab4Page implements OnInit { // Implement OnInit
  @ViewChild('fileInput') fileInput!: ElementRef;

  userProfile: SimpleUser | null = null; // Changed from UserProfile to SimpleUser

  constructor(
    private alertCtrl: AlertController,
    private actionSheetCtrl: ActionSheetController, // Inject ActionSheetController
    private toastCtrl: ToastController, // Inject ToastController
    private authService: AuthService,
    private userService: UserService, // Inject UserService
    private platform: Platform // For checking platform
  ) {}

  ngOnInit() {
    this.loadUserProfile();
  }

  // Use ionViewWillEnter for when the tab is navigated to
  ionViewWillEnter() {
    this.loadUserProfile();
  }

  async loadUserProfile() {
    const currentUser = this.authService.currentUserValue;
    if (currentUser && currentUser._id) {
      try {
        // Fetch full user profile including profileImage from the backend
        const profile = await this.userService.getUserProfile(currentUser._id).toPromise();
        // Update the local userProfile with backend data
        if (profile) {
          this.userProfile = profile; // Assign directly if SimpleUser matches

          // Also update the auth service's internal state if profileImage changed
          // This is important for other parts of the app that might rely on authService.currentUserValue.profileImage
          const updatedAuthUser: AuthResponse = { // Explicitly type as AuthResponse
            _id: currentUser._id,
            name: profile.name,
            email: profile.email || '',
            profileImage: profile.profileImage,
            token: currentUser.token // Ensure token is included
          };
          this.authService.updateCurrentUser(updatedAuthUser);
        }

      } catch (error: any) {
        console.error('Error loading user profile:', error);
        this.presentToast(`Failed to load profile: ${error.message}`, 'danger');
      }
    } else {
      console.log('No current user found, cannot load profile.');
      // Handle case where user is not logged in or doesn't have an ID
    }
  }

  // --- Profile Picture Upload Logic ---
  openFilePicker() {
    this.fileInput.nativeElement.click(); // Programmatically click the hidden file input
  }

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      await this.uploadProfilePicture(file);
    }
  }

  async uploadProfilePicture(file: File) {
    const toast = await this.toastCtrl.create({
      message: 'Uploading profile picture...',
      duration: 0, // Indefinite until dismissed
      position: 'bottom',
      color: 'medium'
    });
    await toast.present();

    try {
      const result = await this.userService.updateProfileImage(file).toPromise(); // Call new userService method
      
      // FIX: Add check for result possibly undefined
      if (result) {
        await toast.dismiss();
        this.presentToast('Profile picture updated!', 'success');
        
        // Update local profile and auth service state
        if (this.userProfile) {
          this.userProfile.profileImage = result.profileImage;
          const currentUser = this.authService.currentUserValue;
          if (currentUser) {
              const updatedAuthUser: AuthResponse = { // Explicitly type as AuthResponse
                _id: currentUser._id,
                name: currentUser.name,
                email: currentUser.email,
                profileImage: result.profileImage,
                token: currentUser.token // Ensure token is included
              };
              this.authService.updateCurrentUser(updatedAuthUser);
          }
        }
      } else {
        await toast.dismiss();
        this.presentToast('Upload completed, but no image URL received.', 'warning');
        console.warn('`updateProfileImage` observable completed without emitting a value.');
      }

    } catch (error: any) {
      await toast.dismiss();
      console.error('Error uploading profile picture:', error);
      this.presentToast(`Upload failed: ${error.message}`, 'danger');
    }
  }

  // --- Profile Management Action Sheet ---
  async presentActionSheet() {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Manage Profile',
      buttons: [
        {
          text: 'Change Profile Picture',
          icon: 'camera-outline',
          handler: () => {
            this.openFilePicker();
          }
        },
        {
          text: 'Edit Name & Email', // You can expand this to include email if your backend allows updates
          icon: 'create-outline',
          handler: () => {
            this.editNameAndEmail();
          }
        },
        {
          text: 'Cancel',
          icon: 'close',
          role: 'cancel',
          handler: () => {
            console.log('Cancel clicked');
          }
        }
      ]
    });
    await actionSheet.present();
  }

  // --- Edit Name & Email (Modified from original editProfile) ---
  async editNameAndEmail() {
    const alert = await this.alertCtrl.create({
      header: 'Edit Profile Details',
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: 'Enter your name',
          value: this.userProfile?.name // Use optional chaining for safety
        },
        {
          name: 'email',
          type: 'email',
          placeholder: 'Enter your email',
          value: this.userProfile?.email, // Allow editing email
          attributes: {
            readonly: true // Consider making email read-only or having a separate verification flow
          }
        }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Save',
          handler: async (data) => {
            // TODO: Implement backend call to update user name (and potentially email if allowed)
            // For now, only update local state
            if (this.userProfile) {
                this.userProfile.name = data.name;
                // this.userProfile.email = data.email; // Only update if your backend allows this via a PATCH/PUT
                this.presentToast('Profile name updated (locally).', 'success'); // Change to 'Profile updated!' when backend is integrated
            }
          }
        }
      ]
    });

    await alert.present();
  }


  onLogout() {
    console.log('[Tab4] onLogout: Initiating logout.');
    this.authService.logout();
    // Redirect to login or home after logout, e.g.:
    // this.router.navigateByUrl('/login');
  }

  async presentToast(message: string, color: string = 'primary') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      position: 'bottom',
      color: color
    });
    toast.present();
  }
}