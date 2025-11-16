// src/app/components/recipe-card/recipe-card.component.ts
import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent,
  IonText, IonRow, IonCol, IonChip, IonIcon, IonLabel, IonButtons, IonButton,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  eyeOutline, createOutline, trashOutline, // Removed checkmarkCircleOutline
  lockClosedOutline, peopleOutline, globeOutline, restaurantOutline, timeOutline
} from 'ionicons/icons';
import { Recipe } from '../../services/recipe';

@Component({
  selector: 'app-recipe-card',
  templateUrl: './recipe-card.component.html',
  styleUrls: ['./recipe-card.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
     IonRow, IonCol, IonChip, IonIcon, IonLabel, IonButtons, IonButton,
  ]
})
export class RecipeCardComponent implements OnInit {
  @Input() recipe!: Recipe;
  @Input() showActions: boolean = true;
  @Input() showUser: boolean = false;
  @Input() showPrivacy: boolean = true;

  @Output() viewDetail = new EventEmitter<string>();
  @Output() editRecipe = new EventEmitter<string>();
  @Output() deleteRecipe = new EventEmitter<string>();
  // REMOVED: @Output() publishRecipe = new EventEmitter<string>();

  constructor() {
    addIcons({
      eyeOutline, createOutline, trashOutline, // Removed checkmarkCircleOutline
      lockClosedOutline, peopleOutline, globeOutline, restaurantOutline, timeOutline
    });
  }

  ngOnInit() {
    if (!this.recipe) {
      console.error('RecipeCardComponent: No recipe input provided.');
    }
  }

  onViewDetail() {
    this.viewDetail.emit(this.recipe._id);
  }

  onEdit() {
    this.editRecipe.emit(this.recipe._id);
  }

  onDelete() {
    this.deleteRecipe.emit(this.recipe._id);
  }

  // REMOVED: onPublish() method
  // onPublish() {
  //   this.publishRecipe.emit(this.recipe._id);
  // }

  getPrivacyColor(privacy: string): string {
    switch (privacy) {
      case 'public': return 'success';
      case 'friends': return 'primary';
      case 'private': return 'warning';
      default: return 'medium';
    }
  }

  getPrivacyIcon(privacy: string): string {
    switch (privacy) {
      case 'public': return 'globe-outline';
      case 'friends': return 'people-outline';
      case 'private': return 'lock-closed-outline';
      default: return 'help-circle-outline';
    }
  }
}