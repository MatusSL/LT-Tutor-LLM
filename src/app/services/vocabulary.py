from app.domain.schemas.models import UserInputAnalysis
# from app.services.words_service import (
#     load_database_words,
#     insert_all_words,
#     update_misused_words,
# )

import string

class Vocabulary:
    
    def __init__(self):
        # self.words: set[str] = load_database_words()
        self.words: set[str] = set()
    

    def find_new_words(self, used_words: set[str]) -> set[str]:
        new_words: set[str] = set()

        for word in used_words:
            if word not in self.words:
                new_words.add(word)

        return new_words


    def verify_new_words(self, new_words: set[str], current_invalid: set[str]) -> set[str]:
        invalid_set = current_invalid
        verified: set[str] = new_words.difference(invalid_set)
        return verified


    def verify_and_update_vocabulary(self, analysis: UserInputAnalysis) -> set[str]:
        formatted_used_words = self.format_user_input(analysis.set_of_words)
        formatted_misused_words = self.format_user_input(analysis.misused_words)

        # update_misused_words(formatted_misused_words)
        
        new_words = self.find_new_words(formatted_used_words)
        verified_words = self.verify_new_words(new_words, formatted_misused_words)
        self.words.update(verified_words)
        # insert_all_words(verified_words)

        return verified_words

        
    def remove_punctuation(self, text: str) -> str:
        result = text.translate(str.maketrans('', '', string.punctuation))
        return result
    

    def turn_text_to_lowercase(self, text: str) -> str:
        lowercase_text = list(map(str.lower, text.split()))
        return " ".join(lowercase_text)
    
    
    def format_user_input(self, words: set[str]) -> set[str]:
        text = " ".join(words)
        removed_punctuation = self.remove_punctuation(text)
        lowercase_text = self.turn_text_to_lowercase(removed_punctuation)
        output = set(lowercase_text.split(' '))
        return output


