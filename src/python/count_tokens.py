import sys
import tiktoken


def count_tokens(text: str, model: str = "gpt-4o") -> int:
    enc = tiktoken.encoding_for_model(model)
    tokens = enc.encode(text)
    token_count = len(tokens)
    return token_count


if __name__ == "__main__":
    if len(sys.argv) < 2:
        text = sys.stdin.read()
    else:
        text = sys.argv[1]

    model = sys.argv[2] if len(sys.argv) > 2 else "gpt-4o"

    token_count = count_tokens(text, model)
    print(token_count)
