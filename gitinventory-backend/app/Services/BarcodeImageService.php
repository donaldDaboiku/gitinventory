<?php

namespace App\Services;

use Picqer\Barcode\BarcodeGeneratorSVG;

class BarcodeImageService
{
    public function svg(string $code, int $widthFactor = 2, int $height = 50): string
    {
        if ($code === '') {
            return '';
        }

        $generator = new BarcodeGeneratorSVG;

        return $generator->getBarcode($code, $generator::TYPE_CODE_128, $widthFactor, $height);
    }
}
