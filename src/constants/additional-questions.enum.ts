import {messages} from "../messages";

export enum AdditionalQuestions {
  AreYouInRussia = "AreYouInRussia",
  HowOldAreYou = "HowOldAreYou"
}

export const AdditionalQuestionsText = {
  [AdditionalQuestions.AreYouInRussia]: messages.areYouInRussia,
  [AdditionalQuestions.HowOldAreYou]: messages.ageQuestion
};