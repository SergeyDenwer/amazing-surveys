import {AgeOptions} from "../src/constants/age-options.enum";
import {BinaryOptions} from "../src/constants/binary-options.enum";
import {AdditionalQuestions} from "../src/constants/additional-questions.enum";
import {MonthlyIncomeOptions} from "../src/constants/monthly-income-options.enum";

export const additionalQuestionsConfig = {
  [AdditionalQuestions.AreYouInRussia]: {
    options: BinaryOptions,
    expiresIn: 4,
  },
  [AdditionalQuestions.HowOldAreYou]: {
    options: AgeOptions,
    expiresIn: 52,
  },
  [AdditionalQuestions.WhatIsYourMonthlyIncome]: {
    options: MonthlyIncomeOptions,
    expiresIn: 26,
  },
};