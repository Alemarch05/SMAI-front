import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';
import { MaterialModule } from '../../../shared/material.module';
import {
  ModelTrainingResponse,
  ModelTrainingService
} from '../../services/model-training.service';

@Component({
  selector: 'app-model-training',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './model-training.component.html',
  styleUrl: './model-training.component.scss'
})
export class ModelTrainingComponent {
  private readonly modelTrainingService = inject(ModelTrainingService);

  readonly isTraining = signal(false);
  readonly trainingResult = signal<ModelTrainingResponse | null>(null);
  readonly errorMessage = signal<string | null>(null);

  trainModel(): void {
    if (this.isTraining()) {
      return;
    }

    this.isTraining.set(true);
    this.trainingResult.set(null);
    this.errorMessage.set(null);

    this.modelTrainingService
      .trainModel()
      .pipe(finalize(() => this.isTraining.set(false)))
      .subscribe({
        next: (response) => {
          if (response.status !== 'success') {
            this.errorMessage.set(
              `El servicio respondió con estado "${response.status}" y no confirmó el entrenamiento.`
            );
            return;
          }
          this.trainingResult.set(response);
        },
        error: (error: HttpErrorResponse) => {
          console.error('Error al entrenar el modelo de IA:', error);
          this.errorMessage.set(this.getErrorMessage(error));
        }
      });
  }

  private getErrorMessage(error: HttpErrorResponse): string {
    if (
      typeof error.error === 'object' &&
      error.error !== null &&
      'message' in error.error &&
      typeof error.error.message === 'string'
    ) {
      return error.error.message;
    }

    if (error.status === 0) {
      return 'No se pudo conectar con el servicio de IA en el puerto 8002. Verifica que esté activo.';
    }

    return `No se pudo entrenar el modelo (error HTTP ${error.status}).`;
  }
}
