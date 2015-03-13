var Binary = require( '../app/browser/binary.js' );

exports.Binary = {

    'can encode and decode a range of UTF-8 characters': function( test ) {
        var testString = '!"#$%¡¢£¤¥¦§¨©ª«¬­®¯°±²³´µ¶·¸¹º»¼½¾¿' +
            'ÀÁÂÃÄÅĀāĂăĄąĆćĈĉĊċƀƁƂƃƄƅƆƇƈɐɑɒɓɔɕɖɗɘəɚɛɜʰʱʲʳʴʵʶʷʸ' + 
            'ʹʺʻʼʽʾʿˀˁ˂˃̀ ́ ̂ ̃ ̄ ̅ ̆ ̇ ̈ ̉ ̊ ̋ ̌ ̍ ̎ ̏ ̐ΑΒΓΔΕΖΗΘЁЂЃЄЅІЇЈЉЊ' +
            'ԱԲԳԴԵԶԷԸअआइईउঅআইঈউਈਉਊਏਐਓఎఏఐఒఓఔഇഈഉഊഋฆงจฉชซ' +
            '༃༄༅༆༇ႤႥႦႧႨ℆ℇ℈℉ℊℋ⅘⅙⅚⅛⅜⅝↔↕↖↗∈∉∊∋∌∍⌘⌙⑧⑨⑩' +
            '▁▂▃▄▅▆▇█▥▦▧▨▩☃☄★✆✇✈✉ぅうぇえぉェエォオ㊌㊍㊎㊏龜契' +
            'ＫＬＭＮＯＰＱＲＳＴ';
        test.equals( Binary.decode( Binary.encode( testString ) ), testString );
        test.done();
    },
    
    'can encode and decode a complex JSON structure': function( test ) {
        var testStructure = {
            array: [1, 2, 3, {
                foo: 'carrot',
                bar: [ 'potato' ],
                baz: [ 'carrot', 'potato', 1, 2, true, false ],
            } ],
            banana: 'delicious',
            something: 3289589321,
            other: 1.259203
        };
        test.deepEqual( Binary.decode( Binary.encode( testStructure ) ), testStructure );
        test.done();
    },

};
