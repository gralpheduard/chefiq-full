// C:\Users\Ralph Gannaban\Desktop\dev\sideline\chefiq\frontend\src\app\pages\recipe-form\recipe-form.page.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonItem, IonLabel, IonInput, IonTextarea,
  IonButton, IonSelect, IonSelectOption, IonButtons, IonBackButton, IonIcon,
  ToastController, AlertController, LoadingController,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonCardSubtitle,
  IonRow, IonCol,
  IonNote,
  IonText,
  IonChip,
  IonProgressBar,
  IonList,
  IonImg
} from '@ionic/angular/standalone';

import { CommonModule } from '@angular/common';
import { addIcons } from 'ionicons';
import {
  addOutline, removeOutline, cameraOutline, videocamOutline, hardwareChipOutline,
  saveOutline, checkmarkCircleOutline, arrowForwardOutline, arrowBackOutline,
  lockClosedOutline, peopleOutline, globeOutline,
  logOutOutline, cloudUploadOutline
} from 'ionicons/icons';

import { RecipeService, Recipe, Ingredient, Step } from '../../services/recipe';
import { UploadService } from '../../services/upload.service';

@Component({
  selector: 'app-recipe-form',
  templateUrl: './recipe-form.page.html',
  styleUrls: ['./recipe-form.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonItem, IonLabel, IonInput, IonTextarea,
    IonButton, IonSelect, IonSelectOption, IonButtons, IonBackButton, IonIcon,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonCardSubtitle,
    IonRow, IonCol,
    IonNote,
    IonText,
    IonChip,
    IonProgressBar,
    IonList,
    IonImg
  ],
})
export class RecipeFormPage implements OnInit {
  recipeForm: FormGroup;
  recipeId: string | null = null;
  isEditMode = false;

  currentSlideIndex = 0;
  totalSlides = 6;

  difficultyOptions = ['Easy', 'Medium', 'Hard'];
  cuisineTags = ['American', 'Italian', 'Mexican', 'Asian', 'Indian', 'Mediterranean', 'French', 'Other'];
  dietTags = ['Vegetarian', 'Vegan', 'Gluten-Free', 'Keto', 'Paleo', 'Dairy-Free', 'Other'];
  courseTags = ['Appetizer', 'Main Course', 'Dessert', 'Breakfast', 'Snack', 'Drink', 'Other'];
  unitOptions = ['g', 'kg', 'ml', 'l', 'cup', 'tsp', 'tbsp', 'oz', 'lb', 'each', 'pinch', 'dash'];
  privacyOptions = ['public', 'friends', 'private'];

  selectedMainImageFile: File | null = null;
  mainImagePreviewUrl: string | ArrayBuffer | null = null;
  isUploadingImage = false;

  constructor(
    private fb: FormBuilder,
    private recipeService: RecipeService,
    private uploadService: UploadService,
    private route: ActivatedRoute,
    private router: Router,
    private toastController: ToastController,
    private alertController: AlertController,
    private loadingController: LoadingController
  ) {
    addIcons({
      addOutline, removeOutline, cameraOutline, videocamOutline, hardwareChipOutline,
      saveOutline, checkmarkCircleOutline, arrowForwardOutline, arrowBackOutline,
      lockClosedOutline, peopleOutline, globeOutline,
      logOutOutline, cloudUploadOutline
    });

    this.recipeForm = this.fb.group({
      generalInfo: this.fb.group({
        title: ['', [Validators.required, Validators.maxLength(100)]],
        description: ['', [Validators.required, Validators.maxLength(1000)]],
        privacy: ['private', Validators.required],
        mainImage: [''],
      }),
      ingredients: this.fb.array([], [Validators.required]),
      steps: this.fb.array([], [Validators.required]),
      metadata: this.fb.group({
        difficulty: ['Medium', Validators.required],
        yield: ['', Validators.required],
        prepTime: [0, [Validators.min(0)]],
        cookTime: [0, [Validators.min(0)]],
        tags: this.fb.array([])
      }),
      // Removed 'status' field from frontend form initialization as it's handled by backend
    });
  }

  ngOnInit() {
    this.recipeId = this.route.snapshot.paramMap.get('id');
    if (this.recipeId) {
      this.isEditMode = true;
      this.loadRecipeForEdit(this.recipeId);
    } else {
      if (this.ingredients.length === 0) {
        this.addIngredient();
      }
      if (this.steps.length === 0) {
        this.addStep();
      }
    }
  }

  // --- Getters for FormGroups and FormArrays ---
  get generalInfoGroup(): FormGroup {
    return this.recipeForm.get('generalInfo') as FormGroup;
  }

  get metadataGroup(): FormGroup {
    return this.recipeForm.get('metadata') as FormGroup;
  }

  get metadataTags() {
    return this.metadataGroup.get('tags') as FormArray;
  }

  get ingredients() {
    return this.recipeForm.get('ingredients') as FormArray;
  }

  get steps() {
    return this.recipeForm.get('steps') as FormArray;
  }

  // --- Image Upload Logic ---
  onFileSelected(event: Event) {
    const element = event.currentTarget as HTMLInputElement;
    const fileList: FileList | null = element.files;
    if (fileList && fileList.length > 0) {
      this.selectedMainImageFile = fileList[0];
      this.previewMainImage(this.selectedMainImageFile);
      console.log('File selected:', this.selectedMainImageFile.name);
    } else {
      this.selectedMainImageFile = null;
      this.mainImagePreviewUrl = null;
      console.log('No file selected.');
    }
  }

  previewMainImage(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      this.mainImagePreviewUrl = reader.result;
    };
    reader.readAsDataURL(file);
  }

  async uploadMainImage() {
    if (!this.selectedMainImageFile) {
      this.presentToast('Please select an image first.', 'warning');
      return;
    }

    this.isUploadingImage = true;
    const loading = await this.loadingController.create({ message: 'Uploading image...' });
    await loading.present();

    try {
      const uploadResult = await this.uploadService.uploadImage(this.selectedMainImageFile).toPromise();
      if (uploadResult && uploadResult.imageUrl) {
        this.generalInfoGroup.get('mainImage')?.setValue(uploadResult.imageUrl);
        console.log('Uploaded image URL received and set to form:', uploadResult.imageUrl);
        this.presentToast('Image uploaded successfully!', 'success');
        this.selectedMainImageFile = null;
        this.generalInfoGroup.get('mainImage')?.markAsDirty();
        this.generalInfoGroup.get('mainImage')?.markAsTouched();
      } else {
        throw new Error('Upload service did not return an image URL.');
      }
    } catch (error: any) {
      console.error('Error uploading main image:', error);
      this.presentToast(error.message || 'Failed to upload image.', 'danger');
      this.mainImagePreviewUrl = null;
      this.generalInfoGroup.get('mainImage')?.setValue('');
    } finally {
      this.isUploadingImage = false;
      await loading.dismiss();
    }
  }

  // --- Slide Navigation and Validation ---
  async nextSlide() {
    console.log(`Attempting to move from slide ${this.currentSlideIndex + 1} to ${this.currentSlideIndex + 2}`);
    const isValid = await this.validateCurrentSlide();
    if (isValid) {
      if (this.currentSlideIndex < this.totalSlides - 1) {
        this.currentSlideIndex++;
        console.log(`Moved to slide ${this.currentSlideIndex + 1}`);
      }
    } else {
      this.presentToast('Please fill in all required fields for this step.', 'danger');
      console.warn(`Validation failed for slide ${this.currentSlideIndex + 1}. Cannot proceed.`);
    }
  }

  async prevSlide() {
    if (this.currentSlideIndex > 0) {
      this.currentSlideIndex--;
      console.log(`Moved to previous slide ${this.currentSlideIndex + 1}`);
    }
  }

  async validateCurrentSlide(): Promise<boolean> {
    let currentGroup: FormGroup | FormArray | null = null;
    let isValidSlide = true;

    switch (this.currentSlideIndex) {
      case 0: // General Info
        currentGroup = this.generalInfoGroup;
        ['title', 'description', 'privacy'].forEach(key => {
          this.generalInfoGroup.get(key)?.markAsTouched();
        });
        isValidSlide = this.generalInfoGroup.get('title')?.valid === true &&
                       this.generalInfoGroup.get('description')?.valid === true &&
                       this.generalInfoGroup.get('privacy')?.valid === true;
        console.log(`Slide 1 (General Info) validation: ${isValidSlide}`);
        break;
      case 1: // Main Image Upload
        // Main image is now critical, so validate its presence here too
        const mainImageUrl = this.generalInfoGroup.get('mainImage')?.value;
        if (!mainImageUrl) {
            this.presentToast('A main image is required. Please upload one.', 'danger');
            isValidSlide = false;
        }
        console.log(`Slide 2 (Main Image) validation: ${isValidSlide}`);
        break;
      case 2: // Ingredients
        currentGroup = this.ingredients;
        break;
      case 3: // Steps
        currentGroup = this.steps;
        break;
      case 4: // Metadata
        currentGroup = this.metadataGroup;
        ['difficulty', 'yield'].forEach(key => { // Also mark required metadata fields as touched
            this.metadataGroup.get(key)?.markAsTouched();
        });
        break;
      case 5: // Review (no direct validation for advancing, overall form validity is checked before submit)
        isValidSlide = true;
        console.log(`Slide 6 (Review) validation: ${isValidSlide}`);
        break;
      default:
        isValidSlide = true;
    }

    if (currentGroup) {
      if (currentGroup instanceof FormGroup) {
        Object.keys(currentGroup.controls).forEach(key => {
          currentGroup?.get(key)?.markAsTouched();
        });
      } else if (currentGroup instanceof FormArray) {
        currentGroup.controls.forEach(control => control.markAsTouched());
      }
      if (this.currentSlideIndex !== 1) { // Skip this for slide 2 as main image check is separate
          isValidSlide = isValidSlide && currentGroup.valid;
      }

      if (this.currentSlideIndex !== 0 && this.currentSlideIndex !== 1 && this.currentSlideIndex !== 5) {
        console.log(`Slide ${this.currentSlideIndex + 1} (${(currentGroup as any).name || 'FormArray'}) validation: ${isValidSlide}`);
      }
    }
    return isValidSlide;
  }

  // REMOVED: logPublishButtonState is no longer relevant

  // --- Tag Management ---
  getSelectedCuisineTags(): string[] {
    return this.metadataTags.value.filter((tag: string) => this.cuisineTags.includes(tag));
  }

  getSelectedDietTags(): string[] {
    return this.metadataTags.value.filter((tag: string) => this.dietTags.includes(tag));
  }

  getSelectedCourseTags(): string[] {
    return this.metadataTags.value.filter((tag: string) => this.courseTags.includes(tag));
  }

  onSelectTag(event: any, category: string) {
    const selectedValue = event.detail.value;
    const allCurrentTags: string[] = Array.from(this.metadataTags.value);

    let tagsToKeep: string[] = allCurrentTags;
    if (category === 'cuisine') {
        tagsToKeep = allCurrentTags.filter(tag => !this.cuisineTags.includes(tag));
    } else if (category === 'diet') {
        tagsToKeep = allCurrentTags.filter(tag => !this.dietTags.includes(tag));
    } else if (category === 'course') {
        tagsToKeep = allCurrentTags.filter(tag => !this.courseTags.includes(tag));
    }

    const combinedTagsSet = new Set([...tagsToKeep, ...selectedValue]);

    this.metadataTags.clear();
    combinedTagsSet.forEach(tag => this.metadataTags.push(this.fb.control(tag)));

    this.metadataTags.markAsDirty();
    this.metadataTags.markAsTouched();
  }


  // --- Ingredient Management ---
  addIngredient() {
    this.ingredients.push(this.fb.group({
      name: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(0.01)]],
      unit: ['each', Validators.required],
      notes: ['']
    }));
    this.ingredients.markAsTouched();
    this.ingredients.markAsDirty();
  }

  removeIngredient(index: number) {
    if (this.ingredients.length > 1) {
      this.ingredients.removeAt(index);
    } else {
      this.presentToast('A recipe must have at least one ingredient.', 'warning');
    }
    this.ingredients.markAsTouched();
    this.ingredients.markAsDirty();
  }

  // --- Step Management ---
  addStep() {
    this.steps.push(this.fb.group({
      stepNumber: [this.steps.length + 1],
      description: ['', Validators.required],
      photoUrl: [''],
      videoUrl: [''],
      applianceIntegration: this.fb.group({
        type: [''],
        settings: this.fb.group({}),
        notes: ['']
      }),
    }));
    this.steps.markAsTouched();
    this.steps.markAsDirty();
  }

  removeStep(index: number) {
    if (this.steps.length > 1) {
      this.steps.removeAt(index);
      this.steps.controls.forEach((control, idx) => control.get('stepNumber')?.setValue(idx + 1));
    } else {
      this.presentToast('A recipe must have at least one step.', 'warning');
    }
    this.steps.markAsTouched();
    this.steps.markAsDirty();
  }

  // --- Recipe Loading (for edit mode) ---
  async loadRecipeForEdit(id: string) {
    const loading = await this.loadingController.create({ message: 'Loading recipe...' });
    await loading.present();
    try {
      const recipe = await this.recipeService.getRecipeById(id).toPromise();
      if (recipe) {
        this.recipeForm.get('generalInfo')?.patchValue({
          title: recipe.title,
          description: recipe.description,
          privacy: recipe.privacy,
          mainImage: recipe.mainImage || '',
        });
        this.mainImagePreviewUrl = recipe.mainImage || null;
        // Removed: this.recipeForm.get('status')?.setValue(recipe.status);

        this.recipeForm.get('metadata')?.patchValue({
          difficulty: recipe.metadata.difficulty,
          yield: recipe.metadata.yield,
          prepTime: recipe.metadata.prepTime,
          cookTime: recipe.metadata.cookTime,
        });

        this.ingredients.clear();
        recipe.ingredients.forEach(ing => {
          this.ingredients.push(this.fb.group(ing));
        });

        this.steps.clear();
        recipe.steps.forEach(step => {
          this.steps.push(this.fb.group({
            stepNumber: step.stepNumber,
            description: step.description,
            photoUrl: step.photoUrl || '',
            videoUrl: step.videoUrl || '',
            applianceIntegration: this.fb.group(step.applianceIntegration || { type: '', settings: {}, notes: '' })
          }));
        });

        this.metadataTags.clear();
        recipe.metadata.tags?.forEach(tag => {
          this.metadataTags.push(this.fb.control(tag));
        });

        console.log('Recipe loaded for edit:');
        console.log('  mainImage:', this.generalInfoGroup.get('mainImage')?.value);
        // Removed: console.log('  status:', this.recipeForm.get('status')?.value);

        this.recipeForm.markAsPristine();
        this.recipeForm.markAsUntouched();

      } else {
        throw new Error('Recipe not found for editing.');
      }
    } catch (error: any) {
      console.error('Error loading recipe:', error);
      this.presentToast(error.message || 'Failed to load recipe for editing.', 'danger');
      this.router.navigateByUrl('/tabs/cookbook');
    } finally {
      await loading.dismiss();
    }
  }

  // --- Form Submission ---
  async onSubmit() { // Removed 'publish: boolean = false' parameter
    this.recipeForm.markAllAsTouched();

    console.log('--- Submitting Recipe Form ---');
    // Removed: this.logPublishButtonState();

    if (this.recipeForm.invalid) {
        console.log('Form errors:', this.recipeForm.errors);
        Object.keys(this.recipeForm.controls).forEach(key => {
            const control = this.recipeForm.get(key);
            if (control?.invalid) {
                console.log(`Control '${key}' is invalid. Errors:`, control.errors);
                if (control instanceof FormGroup || control instanceof FormArray) {
                    Object.keys((control as FormGroup).controls || (control as FormArray).controls).forEach(nestedKey => {
                        const nestedControl = control.get(nestedKey);
                        if (nestedControl?.invalid) {
                            console.log(`  Nested control '${key}.${nestedKey}' is invalid. Errors:`, nestedControl.errors);
                        }
                    });
                }
            }
        });
        this.presentToast('Please complete all required fields.', 'danger');
        return;
    }

    // Add client-side validation for mainImage before sending to backend
    const mainImageUrl = this.generalInfoGroup.get('mainImage')?.value;
    if (!mainImageUrl) {
        this.presentToast('A main image is required to save this recipe.', 'danger');
        return;
    }


    const generalInfo = this.generalInfoGroup.value;
    const metadata = this.metadataGroup.value;

    const finalRecipeData = {
        title: generalInfo.title,
        description: generalInfo.description,
        privacy: generalInfo.privacy,
        mainImage: generalInfo.mainImage,
        ingredients: this.ingredients.value,
        steps: this.steps.value,
        metadata: metadata,
        // Status is not sent from frontend, backend will set it to 'published'
    };
    console.log('Final Recipe data to be sent:', finalRecipeData);

    const loading = await this.loadingController.create({ message: 'Saving recipe...' });
    await loading.present();

    try {
      let savedRecipeResult: Recipe | undefined;

      if (this.isEditMode && this.recipeId) {
        savedRecipeResult = await this.recipeService.updateRecipe(this.recipeId, finalRecipeData as Partial<Recipe>).toPromise();
        this.presentToast('Recipe updated successfully!', 'success');
      } else {
        savedRecipeResult = await this.recipeService.createRecipe(finalRecipeData as Omit<Recipe, '_id' | 'user' | 'status' | 'createdAt' | 'updatedAt'>).toPromise();
        this.presentToast('Recipe created successfully!', 'success');
      }

      if (savedRecipeResult && savedRecipeResult._id) {
          this.recipeId = savedRecipeResult._id;
          this.isEditMode = true;
          // Removed: this.recipeForm.get('status')?.setValue(savedRecipeResult.status); // Status is always 'published' now

          this.router.navigateByUrl('/tabs/cookbook');
      } else {
        throw new Error('Failed to retrieve saved recipe data from the server.');
      }

    } catch (error: any) {
      console.error('Error saving recipe:', error);
      const backendErrorMessage = error?.message || 'Failed to save recipe.';
      this.presentToast(backendErrorMessage, 'danger');
    } finally {
      await loading.dismiss();
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
}