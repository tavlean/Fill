import re

def rgba_to_hsla(match):
    r, g, b, a = match.groups()
    r, g, b = int(r), int(g), int(b)
    
    if r == 255 and g == 255 and b == 255:
        return f"hsla(0, 0%, 100%, {a})"
    elif r == 0 and g == 0 and b == 0:
        return f"hsla(0, 0%, 0%, {a})"
    elif r == 23 and g == 23 and b == 23:
        # 23/255 = 9% lightness
        return f"hsla(0, 0%, 9%, {a})"
    elif r == 28 and g == 28 and b == 30:
        # approx hsl(240, 3%, 11%)
        return f"hsla(240, 3%, 11%, {a})"
    elif r == 38 and g == 38 and b == 40:
        return f"hsla(240, 3%, 15%, {a})"
    else:
        # for other rgbas (like the blue one), just leave them if we want to manually handle
        return match.group(0)

with open('index.html', 'r') as f:
    content = f.read()

# Pattern for rgba(255, 255, 255, 0.5) or rgba(0,0,0,0.5)
pattern = r"rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([0-9.]+)\s*\)"
content = re.sub(pattern, rgba_to_hsla, content)

with open('index.html', 'w') as f:
    f.write(content)
