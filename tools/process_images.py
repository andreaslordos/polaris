import os
import cv2
import numpy as np

def create_circular_thumbnail(input_path, output_path, size=100):
    # Read the image
    img = cv2.imread(input_path)
    
    # Get the minimum dimension
    height, width = img.shape[:2]
    min_dim = min(width, height)
    
    # Calculate crop coordinates
    start_x = (width - min_dim) // 2
    start_y = (height - min_dim) // 2
    
    # Crop to square
    img = img[start_y:start_y + min_dim, start_x:start_x + min_dim]
    
    # Resize to target size
    img = cv2.resize(img, (size, size))
    
    # Create circular mask
    mask = np.zeros((size, size), dtype=np.uint8)
    cv2.circle(mask, (size//2, size//2), size//2, 255, -1)
    
    # Apply mask
    result = cv2.bitwise_and(img, img, mask=mask)
    
    # Add alpha channel
    b, g, r = cv2.split(result)
    alpha = mask
    result = cv2.merge([b, g, r, alpha])
    
    # Save the result
    cv2.imwrite(output_path, result)

def main():
    # Get the absolute path to the project root
    project_root = os.path.dirname(os.path.abspath(__file__))
    
    # Create output directory if it doesn't exist
    output_dir = os.path.join(project_root, '..', 'polaris-app', 'public', 'images', 'thumbnails')
    os.makedirs(output_dir, exist_ok=True)
    
    # Process all images in the input directory
    input_dir = os.path.join(project_root, '..', 'polaris-app', 'public', 'images')
    for filename in os.listdir(input_dir):
        if filename.lower().endswith(('.png', '.jpg', '.jpeg')):
            input_path = os.path.join(input_dir, filename)
            output_path = os.path.join(output_dir, f"{os.path.splitext(filename)[0]}_thumb.png")
            create_circular_thumbnail(input_path, output_path)
            print(f"Processed {filename}")

if __name__ == "__main__":
    main() 